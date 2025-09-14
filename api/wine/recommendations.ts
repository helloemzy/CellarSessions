import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSuccess, sendError, validateMethod, validateRequiredFields } from '../_utils/response';
import { WineRecommendationRequest } from '../_utils/types';
import { getSupabaseClient, Wine, UserPreferences, TastingNote } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, ['POST'])) return;

  try {
    const { user_id, preferences, limit = 10 } = req.body as WineRecommendationRequest;
    
    if (!validateRequiredFields(req, res, ['user_id'])) return;

    const supabase = getSupabaseClient();
    
    // Get user's tasting history and preferences
    const [userPrefsResult, tastingNotesResult] = await Promise.all([
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user_id)
        .single(),
      supabase
        .from('tasting_notes')
        .select(`
          *,
          wines (
            id, name, winery, grape_variety, region, wine_type, price
          )
        `)
        .eq('user_id', user_id)
        .gte('rating', 4) // Only consider wines they liked
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const userPreferences = userPrefsResult.data as UserPreferences | null;
    const userTastingNotes = tastingNotesResult.data as (TastingNote & { wines: Wine })[] || [];

    // Build recommendation query
    let recommendationQuery = supabase
      .from('wines')
      .select(`
        id,
        name,
        winery,
        region,
        country,
        grape_variety,
        vintage,
        alcohol_content,
        price,
        description,
        image_url,
        rating,
        wine_type,
        created_at,
        updated_at
      `);

    // Apply user preferences or provided preferences
    const prefs = preferences || {};
    const finalPrefs = {
      grape_varieties: prefs.grape_varieties || userPreferences?.preferred_grape_varieties || [],
      regions: prefs.regions || userPreferences?.preferred_regions || [],
      wine_types: userPreferences?.preferred_wine_types || [],
      price_range: prefs.price_range || [
        userPreferences?.price_range_min,
        userPreferences?.price_range_max
      ].filter(Boolean) as [number, number] | undefined
    };

    // Apply filters based on preferences
    const conditions: string[] = [];

    if (finalPrefs.grape_varieties.length > 0) {
      const grapeConditions = finalPrefs.grape_varieties
        .map(grape => `grape_variety.ilike.%${grape}%`)
        .join(',');
      conditions.push(`(${grapeConditions})`);
    }

    if (finalPrefs.regions.length > 0) {
      const regionConditions = finalPrefs.regions
        .map(region => `region.ilike.%${region}%`)
        .join(',');
      conditions.push(`(${regionConditions})`);
    }

    if (finalPrefs.wine_types.length > 0) {
      const typeConditions = finalPrefs.wine_types
        .map(type => `wine_type.eq.${type}`)
        .join(',');
      conditions.push(`(${typeConditions})`);
    }

    // Apply price range
    if (finalPrefs.price_range && finalPrefs.price_range.length === 2) {
      const [minPrice, maxPrice] = finalPrefs.price_range;
      if (minPrice !== undefined) {
        recommendationQuery = recommendationQuery.gte('price', minPrice);
      }
      if (maxPrice !== undefined) {
        recommendationQuery = recommendationQuery.lte('price', maxPrice);
      }
    }

    // Combine conditions with OR logic if any exist
    if (conditions.length > 0) {
      recommendationQuery = recommendationQuery.or(conditions.join(','));
    }

    // Exclude wines the user has already tried
    const triedWineIds = userTastingNotes.map(note => note.wine_id);
    if (triedWineIds.length > 0) {
      recommendationQuery = recommendationQuery.not('id', 'in', `(${triedWineIds.join(',')})`);
    }

    // Get recommendations
    recommendationQuery = recommendationQuery
      .order('rating', { ascending: false })
      .limit(parseInt(limit.toString()) * 2); // Get more to allow for post-processing

    const { data: potentialWines, error } = await recommendationQuery;

    if (error) {
      console.error('Supabase error:', error);
      return sendError(res, 'Failed to get wine recommendations', 500);
    }

    // Score and rank wines based on user's taste profile
    const scoredWines = (potentialWines || []).map(wine => ({
      ...wine,
      recommendation_score: calculateRecommendationScore(wine, userTastingNotes, finalPrefs)
    }));

    // Sort by recommendation score and limit results
    const recommendations = scoredWines
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, parseInt(limit.toString()));

    // Get explanation for top recommendation
    const explanation = recommendations.length > 0 
      ? generateRecommendationExplanation(recommendations[0], userTastingNotes, finalPrefs)
      : 'No recommendations available based on current preferences.';

    const result = {
      recommendations,
      user_preferences: finalPrefs,
      explanation,
      based_on: {
        tasting_history_count: userTastingNotes.length,
        has_stored_preferences: !!userPreferences,
        provided_preferences: !!preferences
      }
    };

    sendSuccess(res, result, `Generated ${recommendations.length} wine recommendations`);

  } catch (error) {
    console.error('Wine recommendation error:', error);
    if (error instanceof Error && error.message.includes('Supabase environment variables')) {
      return sendError(res, 'Database connection not configured', 500);
    }
    sendError(res, 'Internal server error during wine recommendation', 500);
  }
}

function calculateRecommendationScore(
  wine: Wine, 
  userTastingNotes: (TastingNote & { wines: Wine })[], 
  preferences: any
): number {
  let score = wine.rating || 0; // Base score from wine rating

  // Boost score based on grape variety preferences
  if (preferences.grape_varieties?.length > 0 && wine.grape_variety) {
    const matchingGrapes = preferences.grape_varieties.filter((grape: string) => 
      wine.grape_variety?.toLowerCase().includes(grape.toLowerCase())
    );
    score += matchingGrapes.length * 2;
  }

  // Boost score based on region preferences
  if (preferences.regions?.length > 0 && wine.region) {
    const matchingRegions = preferences.regions.filter((region: string) => 
      wine.region?.toLowerCase().includes(region.toLowerCase())
    );
    score += matchingRegions.length * 1.5;
  }

  // Boost score based on similar wines the user liked
  const similarWines = userTastingNotes.filter(note => {
    const likedWine = note.wines;
    return (
      likedWine.grape_variety === wine.grape_variety ||
      likedWine.region === wine.region ||
      likedWine.wine_type === wine.wine_type
    );
  });
  
  score += similarWines.length * 1.0;

  // Boost for wines within preferred price range
  if (preferences.price_range && wine.price) {
    const [minPrice, maxPrice] = preferences.price_range;
    if (wine.price >= (minPrice || 0) && wine.price <= (maxPrice || Infinity)) {
      score += 1;
    }
  }

  return score;
}

function generateRecommendationExplanation(
  wine: Wine & { recommendation_score: number },
  userTastingNotes: (TastingNote & { wines: Wine })[],
  preferences: any
): string {
  const reasons: string[] = [];

  if (preferences.grape_varieties?.length > 0 && wine.grape_variety) {
    const matchingGrapes = preferences.grape_varieties.filter((grape: string) => 
      wine.grape_variety?.toLowerCase().includes(grape.toLowerCase())
    );
    if (matchingGrapes.length > 0) {
      reasons.push(`matches your preferred grape variety (${matchingGrapes.join(', ')})`);
    }
  }

  if (preferences.regions?.length > 0 && wine.region) {
    const matchingRegions = preferences.regions.filter((region: string) => 
      wine.region?.toLowerCase().includes(region.toLowerCase())
    );
    if (matchingRegions.length > 0) {
      reasons.push(`from your preferred region (${wine.region})`);
    }
  }

  const similarWines = userTastingNotes.filter(note => {
    const likedWine = note.wines;
    return (
      likedWine.grape_variety === wine.grape_variety ||
      likedWine.region === wine.region
    );
  });

  if (similarWines.length > 0) {
    reasons.push(`similar to wines you've enjoyed before`);
  }

  if (wine.rating && wine.rating >= 4) {
    reasons.push(`highly rated (${wine.rating}/5 stars)`);
  }

  const explanation = reasons.length > 0 
    ? `Recommended because it ${reasons.join(' and ')}.`
    : 'Recommended based on general popularity and quality.';

  return explanation;
}