import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { Feather, MaterialIcons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  onChangeTextAlign: (align: 'left' | 'center' | 'right') => void;
  onApplyList: (type: 'bullet' | 'number' | 'letter') => void;
}

export default function ParagraphStyleModal({
  visible,
  onClose,
  textAlign,
  onChangeTextAlign,
  onApplyList,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Paragraph</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Alignment */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alignment</Text>
                <View style={styles.row}>
                  {(['left', 'center', 'right'] as const).map((align) => {
                    const isActive = textAlign === align;
                    let iconName: 'align-left' | 'align-center' | 'align-right' = 'align-left';
                    if (align === 'center') iconName = 'align-center';
                    if (align === 'right') iconName = 'align-right';

                    return (
                      <TouchableOpacity
                        key={align}
                        onPress={() => onChangeTextAlign(align)}
                        style={[styles.btn, isActive && styles.btnActive]}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={iconName}
                          size={18}
                          color={isActive ? Colors.accent : Colors.textMuted}
                        />
                        <Text style={[styles.btnText, isActive && styles.btnTextActive]}>
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Lists */}
              <View style={[styles.section, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                <Text style={styles.sectionTitle}>Lists</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    onPress={() => {
                      onApplyList('bullet');
                      onClose();
                    }}
                    style={styles.listBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="format-list-bulleted" size={20} color={Colors.accent} />
                    <Text style={styles.listBtnText}>Bulleted</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onApplyList('number');
                      onClose();
                    }}
                    style={styles.listBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="format-list-numbered" size={20} color={Colors.accent} />
                    <Text style={styles.listBtnText}>Numbered</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onApplyList('letter');
                      onClose();
                    }}
                    style={styles.listBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="format-size" size={20} color={Colors.accent} />
                    <Text style={styles.listBtnText}>Lettered (a.)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1.5,
    borderTopColor: Colors.cardBorder,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 10,
    maxHeight: Dimensions.get('window').height * 0.7,
    shadowColor: '#1A2C1E',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontFamily: Typography.bodySemibold,
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btn: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  btnActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  btnText: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  btnTextActive: {
    fontFamily: Typography.bodyMedium,
    color: Colors.accent,
  },
  spacingContainer: {
    gap: Spacing.md,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  groupBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupValue: {
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.cardBorder,
    borderRightWidth: 1,
    borderRightColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupValueText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  pillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pillBtnActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  pillText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  pillTextActive: {
    fontFamily: Typography.bodyMedium,
    color: Colors.accent,
  },
  listBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  listBtnText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.text,
  },
});
