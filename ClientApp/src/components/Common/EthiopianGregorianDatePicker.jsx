import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  toEthiopianDate,
  toGregorianFromEthiopian,
  getDaysInEthiopianMonth,
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  WEEKDAYS,
  formatAppDate,
} from '../../utils/dateUtils';

const EthiopianGregorianDatePicker = ({
  visible,
  initialDate,
  selectedDate: propSelectedDate,
  onConfirm,
  onSelectDate,
  onClose,
  onDismiss,
  title,
}) => {
  const theme = useTheme();
  const { isAmharic } = useLanguage();
  const langKey = isAmharic ? 'am' : 'en';

  const parseInputDate = (input) => {
    if (input instanceof Date && !isNaN(input.getTime())) return input;
    if (typeof input === 'string') {
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  // Selected date is stored as a JS Date
  const [selectedDate, setSelectedDate] = useState(() =>
    parseInputDate(initialDate || propSelectedDate)
  );

  // Active view calendar tab: 'ethiopian' | 'gregorian'
  const [calendarMode, setCalendarMode] = useState('ethiopian');

  // Ethiopian Navigation View State (Year & Month)
  const [ethYear, setEthYear] = useState(2019);
  const [ethMonth, setEthMonth] = useState(3);

  // Gregorian Navigation View State (Year & Month: 0-11)
  const [gregYear, setGregYear] = useState(2026);
  const [gregMonth, setGregMonth] = useState(10); // 0-indexed (10 = November)

  // Sync internal view when modal opens or initialDate changes
  useEffect(() => {
    const d = parseInputDate(initialDate || propSelectedDate);
    setSelectedDate(d);

    // Sync Ethiopian view
    const eth = toEthiopianDate(d);
    if (eth) {
      setEthYear(eth.year);
      setEthMonth(eth.month);
    }

    // Sync Gregorian view
    setGregYear(d.getFullYear());
    setGregMonth(d.getMonth());
  }, [visible, initialDate, propSelectedDate]);

  // Derived current selected date representations
  const selectedEth = useMemo(() => {
    return toEthiopianDate(selectedDate) || { year: 2019, month: 3, day: 1 };
  }, [selectedDate]);

  // Handle Quick Presets (Today, Yesterday)
  const selectToday = () => {
    const now = new Date();
    setSelectedDate(now);
    const eth = toEthiopianDate(now);
    if (eth) {
      setEthYear(eth.year);
      setEthMonth(eth.month);
    }
    setGregYear(now.getFullYear());
    setGregMonth(now.getMonth());
  };

  const selectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(yest);
    const eth = toEthiopianDate(yest);
    if (eth) {
      setEthYear(eth.year);
      setEthMonth(eth.month);
    }
    setGregYear(yest.getFullYear());
    setGregMonth(yest.getMonth());
  };

  // ---------------- ETHIOPIAN CALENDAR LOGIC ----------------
  const handlePrevEthMonth = () => {
    if (ethMonth === 1) {
      setEthMonth(13);
      setEthYear((y) => y - 1);
    } else {
      setEthMonth((m) => m - 1);
    }
  };

  const handleNextEthMonth = () => {
    if (ethMonth === 13) {
      setEthMonth(1);
      setEthYear((y) => y + 1);
    } else {
      setEthMonth((m) => m + 1);
    }
  };

  // Build grid of days for Ethiopian month
  const ethGrid = useMemo(() => {
    const totalDays = getDaysInEthiopianMonth(ethYear, ethMonth);
    // Find the starting weekday of day 1 of this Ethiopian month
    const firstDayDate = toGregorianFromEthiopian(ethYear, ethMonth, 1);
    const startWeekday = firstDayDate.getDay(); // 0 (Sun) to 6 (Sat)

    const cells = [];
    // Blank padding before day 1
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ empty: true, key: `eth-pad-${i}` });
    }

    // Actual days
    for (let day = 1; day <= totalDays; day++) {
      const gDate = toGregorianFromEthiopian(ethYear, ethMonth, day);
      const isSelected =
        selectedEth.year === ethYear &&
        selectedEth.month === ethMonth &&
        selectedEth.day === day;

      const now = new Date();
      const todayEth = toEthiopianDate(now);
      const isToday =
        todayEth &&
        todayEth.year === ethYear &&
        todayEth.month === ethMonth &&
        todayEth.day === day;

      cells.push({
        empty: false,
        day,
        gDate,
        gregDay: gDate.getDate(),
        isSelected,
        isToday,
        key: `eth-${ethYear}-${ethMonth}-${day}`,
      });
    }

    return cells;
  }, [ethYear, ethMonth, selectedEth]);

  // ---------------- GREGORIAN CALENDAR LOGIC ----------------
  const handlePrevGregMonth = () => {
    if (gregMonth === 0) {
      setGregMonth(11);
      setGregYear((y) => y - 1);
    } else {
      setGregMonth((m) => m - 1);
    }
  };

  const handleNextGregMonth = () => {
    if (gregMonth === 11) {
      setGregMonth(0);
      setGregYear((y) => y + 1);
    } else {
      setGregMonth((m) => m + 1);
    }
  };

  // Build grid of days for Gregorian month
  const gregGrid = useMemo(() => {
    const firstDay = new Date(gregYear, gregMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(gregYear, gregMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ empty: true, key: `greg-pad-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const gDate = new Date(gregYear, gregMonth, day);
      const isSelected =
        selectedDate.getFullYear() === gregYear &&
        selectedDate.getMonth() === gregMonth &&
        selectedDate.getDate() === day;

      const now = new Date();
      const isToday =
        now.getFullYear() === gregYear &&
        now.getMonth() === gregMonth &&
        now.getDate() === day;

      const eth = toEthiopianDate(gDate);

      cells.push({
        empty: false,
        day,
        gDate,
        ethDay: eth ? eth.day : null,
        isSelected,
        isToday,
        key: `greg-${gregYear}-${gregMonth}-${day}`,
      });
    }

    return cells;
  }, [gregYear, gregMonth, selectedDate]);

  // Handle Dismiss (Cancel / Close / Backdrop)
  const handleDismiss = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  };

  // Handle Confirm
  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm(selectedDate);
    }
    if (typeof onSelectDate === 'function') {
      onSelectDate(selectedDate.toISOString(), selectedDate);
    }
    handleDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* Top Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Icon
                name="calendar-multiselect"
                size={22}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.dark ? '#FFFFFF' : '#1A1A1A' },
                  isAmharic && styles.amharicFont,
                ]}
              >
                {title || (isAmharic ? 'ቀን ይምረጡ' : 'Select Date')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon
                name="close"
                size={22}
                color={theme.dark ? '#AAAAAA' : '#666666'}
              />
            </TouchableOpacity>
          </View>

          {/* ---------------- 1. CALENDAR SYSTEM TOGGLE ---------------- */}
          <View
            style={[
              styles.modeTabContainer,
              { backgroundColor: theme.dark ? '#222222' : '#F0F4F0' },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modeTabButton,
                calendarMode === 'ethiopian' && styles.modeTabActive,
              ]}
              onPress={() => setCalendarMode('ethiopian')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.modeTabText,
                  calendarMode === 'ethiopian'
                    ? styles.modeTabActiveText
                    : { color: theme.dark ? '#BBB' : '#555' },
                  isAmharic && styles.amharicFont,
                ]}
              >
                🇪🇹 {isAmharic ? 'የኢትዮጵያ ዘመን አቆጣጠር' : 'Ethiopian Calendar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabButton,
                calendarMode === 'gregorian' && styles.modeTabActive,
              ]}
              onPress={() => setCalendarMode('gregorian')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.modeTabText,
                  calendarMode === 'gregorian'
                    ? styles.modeTabActiveText
                    : { color: theme.dark ? '#BBB' : '#555' },
                  isAmharic && styles.amharicFont,
                ]}
              >
                🌐 {isAmharic ? 'የፈረንጆች ዘመን አቆጣጠር' : 'Gregorian Calendar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------------- 2. DUAL-DATE PREVIEW HERO ---------------- */}
          <View
            style={[
              styles.previewHero,
              {
                backgroundColor: theme.dark ? '#0A2613' : '#E8F5E9',
                borderColor: theme.dark ? '#1B5E20' : '#C8E6C9',
              },
            ]}
          >
            <View style={styles.previewLeft}>
              <Text
                style={[
                  styles.previewPrimary,
                  { color: theme.dark ? '#A5D6A7' : '#1B5E20' },
                  isAmharic && styles.amharicFont,
                ]}
              >
                {calendarMode === 'ethiopian'
                  ? `${ETHIOPIAN_MONTHS[langKey][selectedEth.month - 1]} ${selectedEth.day}, ${selectedEth.year} ዓ.ም`
                  : `${GREGORIAN_MONTHS[langKey][selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`}
              </Text>

              {/* Secondary Equivalent Calendar Badge */}
              <View style={styles.previewSubRow}>
                <Icon
                  name="swap-horizontal"
                  size={14}
                  color={theme.dark ? '#81C784' : '#2E7D32'}
                />
                <Text
                  style={[
                    styles.previewSecondary,
                    { color: theme.dark ? '#81C784' : '#2E7D32' },
                    isAmharic && styles.amharicFont,
                  ]}
                >
                  {calendarMode === 'ethiopian'
                    ? `(Gregorian: ${formatAppDate(selectedDate, { calendar: 'gregorian', language: langKey })})`
                    : `(Ethiopian: ${formatAppDate(selectedDate, { calendar: 'ethiopian', language: langKey })})`}
                </Text>
              </View>
            </View>

            {/* Quick Presets */}
            <View style={styles.quickPresetCol}>
              <TouchableOpacity
                style={[styles.presetChip, { backgroundColor: '#2E7D32' }]}
                onPress={selectToday}
              >
                <Text style={styles.presetChipText}>
                  {isAmharic ? 'ዛሬ' : 'Today'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetChip, { backgroundColor: '#1565C0', marginTop: 4 }]}
                onPress={selectYesterday}
              >
                <Text style={styles.presetChipText}>
                  {isAmharic ? 'ትናንት' : 'Yest.'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------- 3. MONTH & YEAR NAVIGATION ---------------- */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={
                calendarMode === 'ethiopian'
                  ? handlePrevEthMonth
                  : handlePrevGregMonth
              }
              style={[styles.navArrowBtn, { backgroundColor: theme.dark ? '#2A2A2A' : '#F0F0F0' }]}
              activeOpacity={0.7}
            >
              <Icon
                name="chevron-left"
                size={24}
                color={theme.dark ? '#FFF' : '#333'}
              />
            </TouchableOpacity>

            <View style={styles.monthTitleWrap}>
              <Text
                style={[
                  styles.navMonthText,
                  { color: theme.dark ? '#FFF' : '#222' },
                  isAmharic && styles.amharicFont,
                ]}
              >
                {calendarMode === 'ethiopian'
                  ? `${ETHIOPIAN_MONTHS[langKey][ethMonth - 1]} ${ethYear}`
                  : `${GREGORIAN_MONTHS[langKey][gregMonth]} ${gregYear}`}
              </Text>
              {calendarMode === 'ethiopian' && ethMonth === 13 && (
                <Text style={styles.pagumeBadge}>
                  {isAmharic ? 'ጳጉሜ (13ኛው ወር)' : 'Pagume (13th Month)'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={
                calendarMode === 'ethiopian'
                  ? handleNextEthMonth
                  : handleNextGregMonth
              }
              style={[styles.navArrowBtn, { backgroundColor: theme.dark ? '#2A2A2A' : '#F0F0F0' }]}
              activeOpacity={0.7}
            >
              <Icon
                name="chevron-right"
                size={24}
                color={theme.dark ? '#FFF' : '#333'}
              />
            </TouchableOpacity>
          </View>

          {/* ---------------- 4. CALENDAR GRID ---------------- */}
          {/* Weekday Labels Header */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS[langKey].map((w, idx) => (
              <View key={idx} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    idx === 0 && { color: '#E53935' }, // Sunday in Red
                    isAmharic && styles.amharicFont,
                  ]}
                >
                  {w}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <ScrollView style={styles.gridScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>
              {calendarMode === 'ethiopian'
                ? ethGrid.map((item) => {
                    if (item.empty) {
                      return <View key={item.key} style={styles.dayCellEmpty} />;
                    }
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.dayCell,
                          item.isSelected && styles.dayCellSelected,
                          item.isToday && !item.isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => setSelectedDate(item.gDate)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            { color: theme.dark ? '#FFF' : '#222' },
                            item.isSelected && styles.dayNumberSelectedText,
                            item.isToday && !item.isSelected && { color: '#2E7D32', fontWeight: 'bold' },
                          ]}
                        >
                          {item.day}
                        </Text>
                        <Text
                          style={[
                            styles.subDayText,
                            item.isSelected && styles.subDaySelectedText,
                          ]}
                        >
                          {item.gregDay}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : gregGrid.map((item) => {
                    if (item.empty) {
                      return <View key={item.key} style={styles.dayCellEmpty} />;
                    }
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.dayCell,
                          item.isSelected && styles.dayCellSelected,
                          item.isToday && !item.isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => setSelectedDate(item.gDate)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            { color: theme.dark ? '#FFF' : '#222' },
                            item.isSelected && styles.dayNumberSelectedText,
                            item.isToday && !item.isSelected && { color: '#2E7D32', fontWeight: 'bold' },
                          ]}
                        >
                          {item.day}
                        </Text>
                        {item.ethDay && (
                          <Text
                            style={[
                              styles.subDayText,
                              item.isSelected && styles.subDaySelectedText,
                            ]}
                          >
                            {item.ethDay}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
            </View>
          </ScrollView>

          {/* ---------------- 5. ACTIONS: CONFIRM / CANCEL ---------------- */}
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              style={styles.cancelBtn}
              textColor={theme.dark ? '#CCC' : '#666'}
            >
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </Button>

            <Button
              mode="contained"
              icon="check-circle"
              onPress={handleConfirm}
              style={styles.confirmBtn}
              contentStyle={styles.confirmBtnContent}
            >
              {isAmharic ? 'ቀን አረጋግጥ' : 'Confirm Date'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 12,
      },
    }),
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 12,
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, serif',
  },
  closeBtn: {
    padding: 4,
  },
  modeTabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: '#2E7D32',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabActiveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  previewHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  previewLeft: {
    flex: 1,
  },
  previewPrimary: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  previewSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewSecondary: {
    fontSize: 11.5,
  },
  quickPresetCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  presetChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    alignItems: 'center',
  },
  navMonthText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pagumeBadge: {
    fontSize: 10.5,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  gridScrollView: {
    maxHeight: 270,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 44,
  },
  dayCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#2E7D32',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#2E7D32',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayNumberSelectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  subDayText: {
    fontSize: 9,
    color: '#888',
    marginTop: -1,
  },
  subDaySelectedText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
  },
  confirmBtn: {
    flex: 2,
    borderRadius: 14,
    backgroundColor: '#2E7D32',
  },
  confirmBtnContent: {
    paddingVertical: 5,
  },
});

export default EthiopianGregorianDatePicker;
