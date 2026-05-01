import React, { useRef, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { formatDate, parseDate, todayKey } from '../hooks/useJournal';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ITEM_WIDTH = 40;
const ITEM_MARGIN = 4;

interface Props {
  selectedDate: string;
  markedDates: Set<string>;
  onSelectDate: (date: string) => void;
}

function buildDays(count = 90): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

export default function CalendarStrip({ selectedDate, markedDates, onSelectDate }: Props) {
  const days = buildDays(90);
  const scrollRef = useRef<ScrollView>(null);
  const todayIndex = days.length - 1;

  useEffect(() => {
    // scroll to selected date
    const idx = days.findIndex((d) => d === selectedDate);
    const x = (idx >= 0 ? idx : todayIndex) * (ITEM_WIDTH + ITEM_MARGIN * 2) - Dimensions.get('window').width / 2 + ITEM_WIDTH / 2;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }, 100);
  }, [selectedDate]);

  const selDateObj = parseDate(selectedDate);
  const isSelectedToday = selectedDate === todayKey();
  const tabTitle = isSelectedToday ? "Today" : DAY_LABELS[selDateObj.getDay()];

  const monthName = MONTH_LABELS[selDateObj.getMonth()];
  const dateStr = `${selDateObj.getDate().toString().padStart(2, '0')}.${(selDateObj.getMonth() + 1).toString().padStart(2, '0')}.${selDateObj.getFullYear().toString().slice(-2)}`;
  
  // Real time for the dashboard feel
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(' ');
  const tNum = timeString[0];
  const tAmPm = timeString[1] || '';

  return (
    <View style={styles.container}>
      {/* Top Row: Tab + Scrollable Dates */}
      <View style={styles.topRow}>
        <View style={styles.tabContainer}>
          <View style={styles.tab}>
            <Text style={styles.tabText}>{tabTitle}</Text>
          </View>
          {/* Inner curve mask */}
          <View style={styles.curveBridge}>
            <View style={styles.curveCutout} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {days.map((date) => {
            const d = parseDate(date);
            const dayNum = d.getDate();
            const isSelected = date === selectedDate;
            const isMarked = markedDates.has(date);
            const isToday = date === todayKey();

            return (
              <TouchableOpacity
                key={date}
                onPress={() => onSelectDate(date)}
                activeOpacity={0.7}
                style={[
                  styles.item,
                  isSelected && styles.itemSelected,
                  isToday && !isSelected && styles.itemToday,
                ]}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                  {dayNum}
                </Text>
                {isMarked && (
                  <View style={[styles.dot, isSelected && styles.dotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Bottom Card */}
      <View style={styles.mainCard}>
        <View style={styles.cardContent}>
          <View style={styles.dateBlock}>
            <Text style={styles.monthText}>{monthName}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeNum}>{tNum}</Text>
            <Text style={styles.timeAmPm}>{tAmPm}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bgDeep,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabContainer: {
    position: 'relative',
    zIndex: 2,
  },
  tab: {
    backgroundColor: Colors.card,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  curveBridge: {
    position: 'absolute',
    bottom: 0,
    right: -24,
    width: 24,
    height: 24,
    backgroundColor: Colors.card,
    zIndex: 1,
  },
  curveCutout: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
    borderBottomLeftRadius: 24,
  },
  scrollView: {
    flex: 1,
    marginLeft: 12,
  },
  scrollContent: {
    paddingBottom: 8,
    alignItems: 'center',
  },
  item: {
    width: 40,
    height: 40,
    marginHorizontal: ITEM_MARGIN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  itemSelected: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'transparent',
  },
  itemToday: {
    borderColor: Colors.accentDim,
  },
  dayNum: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  dayNumSelected: {
    color: Colors.text,
    fontFamily: Typography.bodySemibold,
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accentDim,
  },
  dotSelected: {
    backgroundColor: Colors.accent,
  },
  mainCard: {
    backgroundColor: Colors.card,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 20,
    marginTop: 0,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBlock: {
    flex: 1,
  },
  monthText: {
    fontFamily: Typography.heading,
    fontSize: 30,
    color: Colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 16,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
  },
  timeNum: {
    fontFamily: Typography.bodyMedium,
    fontSize: 42,
    color: Colors.text,
  },
  timeAmPm: {
    fontFamily: Typography.bodySemibold,
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
});
