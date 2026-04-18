import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { formatDate, parseDate } from '../hooks/useJournal';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ITEM_WIDTH = 52;
const ITEM_MARGIN = 6;

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

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((date) => {
        const d = parseDate(date);
        const dayLabel = DAY_LABELS[d.getDay()];
        const dayNum = d.getDate();
        const isSelected = date === selectedDate;
        const isMarked = markedDates.has(date);
        const isToday = date === formatDate(new Date());

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
            <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
              {dayLabel}
            </Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  item: {
    width: ITEM_WIDTH,
    marginHorizontal: ITEM_MARGIN,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  itemSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  itemToday: {
    borderColor: Colors.accentDim,
  },
  dayLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: Colors.bgDeep,
  },
  dayNum: {
    fontFamily: Typography.bodySemibold,
    fontSize: 18,
    color: Colors.text,
    marginTop: 2,
  },
  dayNumSelected: {
    color: Colors.bgDeep,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    marginTop: 3,
  },
  dotSelected: {
    backgroundColor: Colors.white,
  },
});
