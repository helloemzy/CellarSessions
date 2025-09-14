import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList, TextInput } from 'react-native'
import { Controller, useFormContext } from 'react-hook-form'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '@/navigation/types'
import { WinesService, WineWithStats } from '@/services/api/winesService'
import { WSETTastingFormData } from '@/types/wsetForm'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface WineSelectorProps {
  onWineSelect?: (wine: WineWithStats) => void
}

export function WineSelector({ onWineSelect }: WineSelectorProps) {
  const { control, formState: { errors } } = useFormContext<WSETTastingFormData>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [modalVisible, setModalVisible] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [wines, setWines] = React.useState<WineWithStats[]>([])
  const [selectedWine, setSelectedWine] = React.useState<WineWithStats | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Load wines when modal opens
  React.useEffect(() => {
    if (modalVisible) {
      loadWines()
    }
  }, [modalVisible, searchQuery])

  const loadWines = async () => {
    setLoading(true)
    try {
      const { result, error } = await WinesService.searchWines(
        { search: searchQuery },
        0,
        20
      )
      
      if (error) {
        console.error('Error loading wines:', error)
      } else {
        setWines(result.wines)
      }
    } catch (error) {
      console.error('Error loading wines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWineSelect = (wine: WineWithStats, onFieldChange: (value: string) => void) => {
    setSelectedWine(wine)
    onFieldChange(wine.id)
    setModalVisible(false)
    onWineSelect?.(wine)
  }

  const WineItem = ({ wine, onSelect }: { wine: WineWithStats; onSelect: () => void }) => (
    <TouchableOpacity style={styles.wineItem} onPress={onSelect}>
      {wine.image_url && (
        <Image source={{ uri: wine.image_url }} style={styles.wineImage} />
      )}
      <View style={styles.wineInfo}>
        <Text style={styles.wineName} numberOfLines={1}>
          {wine.name}
        </Text>
        <Text style={styles.wineProducer} numberOfLines={1}>
          {wine.producer}
        </Text>
        <View style={styles.wineDetails}>
          <Text style={styles.wineType}>{wine.wine_type}</Text>
          {wine.vintage && (
            <Text style={styles.wineVintage}>{wine.vintage}</Text>
          )}
          <Text style={styles.wineCountry}>{wine.country}</Text>
        </View>
        {wine.average_rating > 0 && (
          <Text style={styles.wineRating}>
            ★ {wine.average_rating.toFixed(1)} ({wine.tasting_notes_count} notes)
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Wine</Text>
      
      <Controller
        control={control}
        name="wineId"
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={[
                styles.selector,
                errors.wineId && styles.selectorError
              ]}
              onPress={() => setModalVisible(true)}
            >
              {selectedWine ? (
                <View style={styles.selectedWineContainer}>
                  {selectedWine.image_url && (
                    <Image source={{ uri: selectedWine.image_url }} style={styles.selectedWineImage} />
                  )}
                  <View style={styles.selectedWineInfo}>
                    <Text style={styles.selectedWineName} numberOfLines={1}>
                      {selectedWine.name}
                    </Text>
                    <Text style={styles.selectedWineDetails} numberOfLines={1}>
                      {selectedWine.producer} • {selectedWine.wine_type}
                      {selectedWine.vintage && ` • ${selectedWine.vintage}`}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  Tap to select a wine to taste...
                </Text>
              )}
            </TouchableOpacity>

            <Modal
              animationType="slide"
              transparent={false}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Wine</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search wines by name, producer, or region..."
                  placeholderTextColor={COLORS.GRAY_400}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => {
                    setModalVisible(false)
                    navigation.navigate('ManualWineEntry')
                  }}
                >
                  <Text style={styles.manualEntryText}>+ Add Wine Manually</Text>
                </TouchableOpacity>

                <FlatList
                  data={wines}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <WineItem
                      wine={item}
                      onSelect={() => handleWineSelect(item, onChange)}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.wineList}
                  onRefresh={loadWines}
                  refreshing={loading}
                />
              </View>
            </Modal>
          </>
        )}
      />

      {errors.wineId && (
        <Text style={styles.errorText}>{errors.wineId.message}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.SM,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
    marginBottom: SPACING.SM,
  },
  selector: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
    borderRadius: BORDER_RADIUS.BASE,
    padding: SPACING.BASE,
    backgroundColor: COLORS.WHITE,
    minHeight: 60,
    justifyContent: 'center',
  },
  selectorError: {
    borderColor: COLORS.ERROR,
  },
  placeholderText: {
    color: COLORS.GRAY_400,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  selectedWineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedWineImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.SM,
  },
  selectedWineInfo: {
    flex: 1,
  },
  selectedWineName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
    marginBottom: 2,
  },
  selectedWineDetails: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.BASE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
    color: COLORS.GRAY_900,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    color: COLORS.GRAY_600,
  },
  searchInput: {
    margin: SPACING.BASE,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
    borderRadius: BORDER_RADIUS.BASE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    backgroundColor: COLORS.WHITE,
  },
  wineList: {
    padding: SPACING.BASE,
  },
  wineItem: {
    flexDirection: 'row',
    padding: SPACING.BASE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_100,
    alignItems: 'center',
  },
  wineImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.BASE,
  },
  wineInfo: {
    flex: 1,
  },
  wineName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
    marginBottom: 2,
  },
  wineProducer: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_700,
    marginBottom: 4,
  },
  wineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wineType: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.WHITE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.XS,
  },
  wineVintage: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    backgroundColor: COLORS.GRAY_200,
    color: COLORS.GRAY_700,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.XS,
  },
  wineCountry: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.GRAY_600,
  },
  wineRating: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.SECONDARY_DARK,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
  manualEntryButton: {
    marginHorizontal: SPACING.BASE,
    marginBottom: SPACING.SM,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    backgroundColor: COLORS.SECONDARY,
    borderRadius: BORDER_RADIUS.BASE,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY_DARK,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  manualEntryText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.SECONDARY_DARK,
  },
})