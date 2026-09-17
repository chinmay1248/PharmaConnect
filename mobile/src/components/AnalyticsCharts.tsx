import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ThemeMode, ThemePalette } from '../theme/theme';

export type RevenueTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type TopItem = {
  medicineId: string;
  brandName: string;
  quantity: number;
  revenue: number;
};

type RevenueTrendChartProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  data: RevenueTrendPoint[];
  currencyFormatter: (value: number) => string;
};

const CHART_HEIGHT = 160;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 28;

function formatDayLabel(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// A lightweight line + area chart drawn with react-native-svg. No third-party charting
// library is used so the bundle stays small and the visuals stay on-brand.
export function RevenueTrendChart({ mode, theme, data, currencyFormatter }: RevenueTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const maxRevenue = Math.max(1, ...data.map((point) => point.revenue));
  const hasRevenue = data.some((point) => point.revenue > 0);

  const points = data.map((point, index) => {
    const x = data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2;
    const y = CHART_PADDING_TOP + plotHeight - (point.revenue / maxRevenue) * plotHeight;
    return { x, y, point };
  });

  const linePath = points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${(CHART_PADDING_TOP + plotHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(CHART_PADDING_TOP + plotHeight).toFixed(1)} Z`
    : '';

  const active = activeIndex !== null ? points[activeIndex] : null;
  const gridLineY = CHART_PADDING_TOP + plotHeight;

  return (
    <View
      style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.chartHeaderRow}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Revenue, last 14 days</Text>
        {active ? (
          <Text style={[styles.chartActiveValue, { color: theme.primaryStrong }]}>
            {currencyFormatter(active.point.revenue)} - {formatDayLabel(active.point.date)}
          </Text>
        ) : (
          <Text style={[styles.chartActiveValue, { color: theme.subtext }]}>
            {currencyFormatter(data.reduce((sum, point) => sum + point.revenue, 0))} total
          </Text>
        )}
      </View>

      {chartWidth > 0 && hasRevenue ? (
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.primary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={theme.primary} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Line x1={0} y1={gridLineY} x2={chartWidth} y2={gridLineY} stroke={theme.hairline} strokeWidth={1} />
          <Path d={areaPath} fill="url(#revenueArea)" />
          <Path d={linePath} fill="none" stroke={theme.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, index) => (
            <Circle
              key={p.point.date}
              cx={p.x}
              cy={p.y}
              r={activeIndex === index ? 5 : 3}
              fill={theme.primary}
              stroke={theme.surface}
              strokeWidth={activeIndex === index ? 2 : 1}
              onPress={() => setActiveIndex(index === activeIndex ? null : index)}
            />
          ))}
          {points.map((p, index) => (
            <Rect
              key={`hit-${p.point.date}`}
              x={p.x - (chartWidth / Math.max(1, points.length)) / 2}
              y={0}
              width={chartWidth / Math.max(1, points.length)}
              height={CHART_HEIGHT}
              fill="transparent"
              onPress={() => setActiveIndex(index === activeIndex ? null : index)}
            />
          ))}
        </Svg>
      ) : (
        <View style={[styles.emptyChart, { height: CHART_HEIGHT }]}>
          <Text style={{ color: theme.subtext }}>No paid orders in this window yet.</Text>
        </View>
      )}

      <View style={styles.chartAxisRow}>
        <Text style={[styles.axisLabel, { color: theme.subtext }]}>{data[0] ? formatDayLabel(data[0].date) : ''}</Text>
        <Text style={[styles.axisLabel, { color: theme.subtext }]}>
          {data[data.length - 1] ? formatDayLabel(data[data.length - 1].date) : ''}
        </Text>
      </View>
    </View>
  );
}

type TopItemsChartProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  data: TopItem[];
  currencyFormatter: (value: number) => string;
  title?: string;
  emptyLabel?: string;
};

// A horizontal bar breakdown of the top-revenue items, also hand-drawn with SVG rects so it
// matches the line chart's visual language exactly.
export function TopItemsChart({ mode, theme, data, currencyFormatter, title, emptyLabel }: TopItemsChartProps) {
  const [barsWidth, setBarsWidth] = useState(0);
  const maxRevenue = Math.max(1, ...data.map((item) => item.revenue));
  const barHeight = 10;

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.chartTitle, { color: theme.text }]}>{title ?? 'Top items by revenue'}</Text>

      {data.length === 0 ? (
        <View style={styles.emptyChart}>
          <Text style={{ color: theme.subtext }}>{emptyLabel ?? 'No paid orders yet.'}</Text>
        </View>
      ) : (
        <View style={styles.topItemsList} onLayout={(event) => setBarsWidth(event.nativeEvent.layout.width)}>
          {data.map((item, index) => {
            const widthRatio = item.revenue / maxRevenue;
            return (
              <View key={item.medicineId} style={styles.topItemRow}>
                <View style={styles.topItemLabelRow}>
                  <Text style={[styles.topItemRank, { color: theme.subtext }]}>#{index + 1}</Text>
                  <Text style={[styles.topItemName, { color: theme.text }]} numberOfLines={1}>
                    {item.brandName}
                  </Text>
                  <Text style={[styles.topItemValue, { color: theme.primaryStrong }]}>{currencyFormatter(item.revenue)}</Text>
                </View>
                {barsWidth > 0 ? (
                  <Svg width={barsWidth} height={barHeight + 4}>
                    <Rect x={0} y={2} width={barsWidth} height={barHeight} rx={barHeight / 2} fill={theme.surfaceAlt} />
                    <Rect
                      x={0}
                      y={2}
                      width={Math.max(6, barsWidth * widthRatio)}
                      height={barHeight}
                      rx={barHeight / 2}
                      fill={theme.primary}
                    />
                  </Svg>
                ) : null}
                <Text style={[styles.topItemMeta, { color: theme.subtext }]}>{item.quantity} units sold</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartActiveValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  topItemsList: {
    gap: 16,
  },
  topItemRow: {
    gap: 6,
  },
  topItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topItemRank: {
    fontSize: 12,
    fontWeight: '700',
    width: 22,
  },
  topItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  topItemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  topItemMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
});
