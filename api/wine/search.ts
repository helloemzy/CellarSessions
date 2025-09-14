import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSuccess, sendError, validateMethod } from '../_utils/response';
import { WineSearchRequest } from '../_utils/types';
import { getSupabaseClient, Wine } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, ['GET', 'POST'])) return;

  try {
    const supabase = getSupabaseClient();
    
    // Extract search parameters from query string (GET) or body (POST)
    const params: WineSearchRequest = req.method === 'GET' ? req.query : req.body;
    const {
      query,
      winery,
      region,
      grape_variety,
      vintage,
      price_min,
      price_max,
      limit = 20,
      offset = 0
    } = params;

    // Build the Supabase query
    let supabaseQuery = supabase
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

    // Apply filters
    if (query) {
      // Full-text search across name, winery, and description
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,winery.ilike.%${query}%,description.ilike.%${query}%,grape_variety.ilike.%${query}%`
      );
    }

    if (winery) {
      supabaseQuery = supabaseQuery.ilike('winery', `%${winery}%`);
    }

    if (region) {
      supabaseQuery = supabaseQuery.ilike('region', `%${region}%`);
    }

    if (grape_variety) {
      supabaseQuery = supabaseQuery.ilike('grape_variety', `%${grape_variety}%`);
    }

    if (vintage) {
      const vintageNum = parseInt(vintage.toString());
      if (!isNaN(vintageNum)) {
        supabaseQuery = supabaseQuery.eq('vintage', vintageNum);
      }
    }

    if (price_min !== undefined) {
      const priceMinNum = parseFloat(price_min.toString());
      if (!isNaN(priceMinNum)) {
        supabaseQuery = supabaseQuery.gte('price', priceMinNum);
      }
    }

    if (price_max !== undefined) {
      const priceMaxNum = parseFloat(price_max.toString());
      if (!isNaN(priceMaxNum)) {
        supabaseQuery = supabaseQuery.lte('price', priceMaxNum);
      }
    }

    // Apply pagination and sorting
    supabaseQuery = supabaseQuery
      .order('rating', { ascending: false })
      .order('name', { ascending: true })
      .range(parseInt(offset.toString()), parseInt(offset.toString()) + parseInt(limit.toString()) - 1);

    const { data: wines, error, count } = await supabaseQuery;

    if (error) {
      console.error('Supabase error:', error);
      return sendError(res, 'Failed to search wines', 500);
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('wines')
      .select('*', { count: 'exact', head: true });

    const result = {
      wines: wines || [],
      pagination: {
        total: totalCount || 0,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        has_next: (parseInt(offset.toString()) + parseInt(limit.toString())) < (totalCount || 0)
      },
      filters_applied: {
        query,
        winery,
        region,
        grape_variety,
        vintage,
        price_range: price_min || price_max ? [price_min, price_max] : undefined
      }
    };

    sendSuccess(res, result, `Found ${wines?.length || 0} wines`);

  } catch (error) {
    console.error('Wine search error:', error);
    if (error instanceof Error && error.message.includes('Supabase environment variables')) {
      return sendError(res, 'Database connection not configured', 500);
    }
    sendError(res, 'Internal server error during wine search', 500);
  }
}