import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { channelROICalculators } from '../data/restaurantStats';
import { calculateUnifiedRevenue, RevenueCalculationInputs } from '../services/revenueCalculations';
import MonthlyForecastChart from './MonthlyForecastChart';

interface AttributionData {
  channel: string;
  revenue: number;
  percentage: number;
  color: string;
  details?: string;
}

interface LeverData {
  id: string;
  name: string;
  isActive: boolean;
  currentRevenue: number;
  potentialRevenue: number;
  color: string;
  icon: string;
  methodology: string;
  dataSource: string;
}

interface DualRevenueVisualizationProps {
  monthlyRevenue: number;
  avgTicket: number;
  monthlyTransactions: number;
  localPackPosition?: number;
  organicPosition?: number;
  localPackKeywords?: {
    position1: number;
    position2: number;
    position3: number;
  };
  organicKeywords?: {
    position1: number;
    position2: number;
    position3: number;
    position4: number;
    position5: number;
  };
  hasLoyaltyProgram?: boolean;
  smsListSize?: number;
  emailListSize?: number;
  socialFollowers?: number;
  thirdPartyPercentage?: number;
  currentSEORevenue?: number;
  restaurantData?: RevenueCalculationInputs;
}

const DualRevenueVisualization: React.FC<DualRevenueVisualizationProps> = ({
  monthlyRevenue = 50000,
  avgTicket = 25,
  monthlyTransactions = 2000,
  hasLoyaltyProgram = false,
  smsListSize = 0,
  emailListSize = 0,
  socialFollowers = 0,
  thirdPartyPercentage = 20,
  currentSEORevenue = 0,
  restaurantData
}) => {
  const currentChartRef = useRef<SVGSVGElement>(null);
  const optimizedChartRef = useRef<SVGSVGElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<AttributionData | null>(null);
  const [mousePosition, setMousePosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [leverStates, setLeverStates] = useState<{[key: string]: boolean}>({});
  const [month12Data, setMonth12Data] = useState<{
    baseline: number;
    optimized: number;
    difference: number;
    percentageGrowth: number;
  } | null>(null);

  // Calculate lever data using unified revenue calculations
  const leverCalculations = useMemo(() => {
    let seoCurrentRevenue, seoPotentialRevenue, socialCurrentRevenue, socialPotentialRevenue, smsCurrentRevenue, smsPotentialRevenue;
    
    if (restaurantData) {
      const unifiedCalcs = calculateUnifiedRevenue(restaurantData);
      
      seoCurrentRevenue = unifiedCalcs.seo.currentRevenue;
      seoPotentialRevenue = unifiedCalcs.seo.potentialRevenue;
      
      socialCurrentRevenue = unifiedCalcs.social.currentRevenue;
      socialPotentialRevenue = unifiedCalcs.social.potentialRevenue;
      
      smsCurrentRevenue = unifiedCalcs.sms.currentRevenue;
      smsPotentialRevenue = unifiedCalcs.sms.potentialRevenue;
    } else {
      // Fallback to basic calculations
      seoCurrentRevenue = monthlyRevenue * 0.1;
      seoPotentialRevenue = channelROICalculators.calculateSEOROI(monthlyTransactions * 2.5, 5, 1, avgTicket) + seoCurrentRevenue;
      
      socialCurrentRevenue = monthlyRevenue * 0.05;
      socialPotentialRevenue = socialCurrentRevenue + (monthlyTransactions * 0.15 * avgTicket);
      
      smsCurrentRevenue = 0;
      smsPotentialRevenue = channelROICalculators.calculateSMSROI(monthlyTransactions * 0.3, 4, avgTicket);
    }

    // No additional boost multiplier needed since boosts are already applied in revenue calculations
    // SEO is boosted by 50%, Social by 20%, SMS is capped for realism
    
    return [
      {
        id: 'seo',
        name: 'SEO & Local Search',
        isActive: false,
        currentRevenue: seoCurrentRevenue,
        potentialRevenue: seoPotentialRevenue, // Already boosted by 50% in calculations
        color: '#4CAF50',
        icon: '🔍',
        methodology: 'Based on Local Pack vs Organic search attribution (70%/30% split) and position-specific CTR: Local Pack Position #1 (33% CTR), #2 (22% CTR), #3 (13% CTR). Organic Search Position #1 (18% CTR), #2 (7% CTR), #3 (3% CTR). Uses 5% website conversion rate and 2.5x search volume multiplier. Enhanced performance projections.',
        dataSource: 'Google Local Search Study 2024, Local SEO Click-Through Rate Analysis, Restaurant Industry Benchmarks'
      },
      {
        id: 'social',
        name: 'Social Media Marketing',
        isActive: false,
        currentRevenue: socialCurrentRevenue,
        potentialRevenue: socialPotentialRevenue, // Already boosted by 20% in calculations
        color: '#E91E63',
        icon: '📱',
        methodology: 'Calculated using enhanced follower-to-customer conversion rates, with Instagram performing at optimized monthly conversion and Facebook with improved engagement strategies. Accounts for posting frequency impact and advanced content strategy optimization.',
        dataSource: 'Restaurant Social Media Report 2024, Platform-specific engagement studies, Food & Beverage industry analysis'
      },
      {
        id: 'sms',
        name: 'SMS Marketing',
        isActive: false,
        currentRevenue: smsCurrentRevenue,
        potentialRevenue: smsPotentialRevenue, // Capped at 25% of monthly revenue for realism
        color: '#2196F3',
        icon: '💬',
        methodology: 'Based on 98% SMS open rate (highest in F&B sector), 19-20% click-through rate, and 25% conversion rate. Assumes 30% of customers would opt-in to SMS marketing with 4 campaigns per month. 10x higher redemption vs other channels. Revenue capped for realistic projections.',
        dataSource: 'SMS Marketing Benchmark Report, Mobile Marketing Association F&B data, Redemption rate studies'
      }
    ];
  }, [monthlyRevenue, avgTicket, monthlyTransactions, restaurantData]);

  // Combine calculations with toggle states
  const levers = useMemo(() => {
    return leverCalculations.map(lever => ({
      ...lever,
      isActive: leverStates[lever.id] || false
    }));
  }, [leverCalculations, leverStates]);

  // Calculate attribution for both current and optimized scenarios
  const calculateAttribution = (isOptimized: boolean = false): AttributionData[] => {
    let attribution: AttributionData[] = [];
    let baseRevenue = monthlyRevenue;
    
    // Add optimized revenue from active levers + overall business growth
    if (isOptimized) {
      const activeLeverCount = levers.filter(l => l.isActive).length;
      const additionalRevenue = levers.reduce((sum, lever) => {
        if (lever.isActive) {
          return sum + (lever.potentialRevenue - lever.currentRevenue);
        }
        return sum;
      }, 0);
      
      // Simply add additional revenue from active levers (no multipliers)
      if (activeLeverCount > 0) {
        baseRevenue = monthlyRevenue + additionalRevenue;
      } else {
        // No levers active = same as current revenue
        baseRevenue = monthlyRevenue;
      }
    }
    
    // Third-Party Delivery
    let thirdPartyRevenue = 0;
    if (thirdPartyPercentage > 0) {
      thirdPartyRevenue = baseRevenue * (thirdPartyPercentage / 100);
      attribution.push({
        channel: 'Third-Party Delivery',
        revenue: thirdPartyRevenue,
        percentage: thirdPartyPercentage,
        color: '#FF6B6B',
        details: `Commission: 15-30% per order`
      });
    }
    
    // SEO Revenue - enhanced with lever state
    const seoLever = levers.find(l => l.id === 'seo');
    const seoRevenue = isOptimized && seoLever?.isActive ? seoLever.potentialRevenue : (currentSEORevenue || seoLever?.currentRevenue || baseRevenue * 0.1);
    attribution.push({
      channel: 'SEO & Local Search',
      revenue: seoRevenue,
      percentage: (seoRevenue / baseRevenue) * 100,
      color: '#4CAF50',
      details: isOptimized && seoLever?.isActive ? 'Optimized with Boostly' : 'Current performance'
    });
    
    // Social Media - enhanced with lever state
    const socialLever = levers.find(l => l.id === 'social');
    const socialRevenue = isOptimized && socialLever?.isActive ? socialLever.potentialRevenue : (socialLever?.currentRevenue || baseRevenue * 0.05);
    if (socialRevenue > 0) {
      attribution.push({
        channel: 'Social Media',
        revenue: socialRevenue,
        percentage: (socialRevenue / baseRevenue) * 100,
        color: '#E91E63',
        details: isOptimized && socialLever?.isActive ? 'Optimized strategy' : 'Current social presence'
      });
    }
    
    // SMS Marketing - enhanced with lever state
    const smsLever = levers.find(l => l.id === 'sms');
    const smsRevenue = isOptimized && smsLever?.isActive ? smsLever.potentialRevenue : (smsLever?.currentRevenue || 0);
    if (smsRevenue > 0) {
      attribution.push({
        channel: 'SMS Marketing',
        revenue: smsRevenue,
        percentage: (smsRevenue / baseRevenue) * 100,
        color: '#2196F3',
        details: '98% open rate, 19.5% CTR'
      });
    }
    
    // Email Marketing
    if (emailListSize > 0) {
      const emailRevenue = (emailListSize * 0.284 * 0.042 * avgTicket * 0.3);
      attribution.push({
        channel: 'Email Marketing',
        revenue: emailRevenue,
        percentage: (emailRevenue / baseRevenue) * 100,
        color: '#A8E6CF',
        details: '28.4% open rate, 4.2% CTR'
      });
    }
    
    // Loyalty Program
    if (hasLoyaltyProgram) {
      const loyaltyRevenue = baseRevenue * 0.15;
      attribution.push({
        channel: 'Loyalty Program',
        revenue: loyaltyRevenue,
        percentage: (loyaltyRevenue / baseRevenue) * 100,
        color: '#FFD93D',
        details: '20% higher spend, 20% more visits'
      });
    }
    
    // Calculate total of all channels before adding Direct/Walk-in
    const otherChannelsRevenue = attribution.reduce((sum, item) => 
      item.channel !== 'Third-Party Delivery' ? sum + item.revenue : sum, 0);
    const totalChannelRevenue = thirdPartyRevenue + otherChannelsRevenue;
    
    // Calculate Direct/Walk-in revenue with spillover effect when optimized
    let directRevenue = baseRevenue - totalChannelRevenue;
    
    // When optimized and levers are active, add spillover boost to Direct/Walk-in
    if (isOptimized) {
      const hasActiveLevers = levers.some(l => l.isActive);
      if (hasActiveLevers) {
        // 15-20% boost to Direct/Walk-in from marketing spillover effects
        const spilloverMultiplier = 1.18; // 18% boost
        const baseDirectRevenue = Math.max(directRevenue, baseRevenue * 0.2); // Ensure minimum 20% is direct
        directRevenue = baseDirectRevenue * spilloverMultiplier;
      }
    }
    
    // If total channels exceed base revenue, scale them proportionally
    if (totalChannelRevenue > baseRevenue) {
      const scalingFactor = (baseRevenue * 0.8) / totalChannelRevenue; // Leave 20% for Direct/Walk-in
      // Scale down all non-third-party channels proportionally
      attribution = attribution.map(item => {
        if (item.channel !== 'Third-Party Delivery') {
          return {
            ...item,
            revenue: item.revenue * scalingFactor,
            percentage: (item.revenue * scalingFactor / baseRevenue) * 100
          };
        }
        return item;
      });
      
      // Recalculate third-party percentage after scaling
      if (thirdPartyRevenue > 0) {
        const thirdPartyIndex = attribution.findIndex(item => item.channel === 'Third-Party Delivery');
        if (thirdPartyIndex >= 0) {
          attribution[thirdPartyIndex].percentage = (thirdPartyRevenue / baseRevenue) * 100;
        }
      }
      
      // Always add some Direct/Walk-in
      directRevenue = baseRevenue * 0.2; // At least 20% direct
      if (isOptimized && levers.some(l => l.isActive)) {
        directRevenue *= 1.18; // Apply spillover boost
      }
    }
    
    // Add Direct/Walk-in revenue
    if (directRevenue > 0) {
      attribution.push({
        channel: 'Direct/Walk-in',
        revenue: directRevenue,
        percentage: (directRevenue / baseRevenue) * 100,
        color: '#2E7D32',
        details: isOptimized && levers.some(l => l.isActive) 
          ? 'Enhanced by brand awareness & word-of-mouth' 
          : 'Repeat customers, walk-ins, direct traffic'
      });
    }
    
    return attribution.sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate dynamic scale for optimized chart based on active levers
  const getOptimizedChartScale = () => {
    const activeLeverCount = levers.filter(l => l.isActive).length;
    // Base scale 1.0, grow by 0.15 for each active lever (smoother than size changes)
    const scalePerLever = 0.15;
    return 1.0 + (activeLeverCount * scalePerLever);
  };

  // Generate dynamic title for optimized chart
  const getOptimizedChartTitle = () => {
    const leverServiceMap: { [key: string]: string } = {
      'seo': 'SEO',
      'social': 'Social Media',
      'sms': 'SMS Marketing'
    };

    const activeServices = levers
      .filter(lever => lever.isActive)
      .map(lever => leverServiceMap[lever.id])
      .filter(Boolean);

    if (activeServices.length === 0) {
      return 'Revenue DNA with no changes';
    }

    return `Revenue DNA + ${activeServices.join(' + ')}`;
  };

  // D3 Chart rendering function
  const renderChart = (svgRef: React.RefObject<SVGSVGElement>, data: AttributionData[], isOptimized: boolean = false) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use same base dimensions for both charts - scaling will be handled by CSS transform
    const width = 480;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<AttributionData>()
      .value(d => d.revenue)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<AttributionData>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    const hoverArc = d3.arc<d3.PieArcDatum<AttributionData>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 1.05);

    // Add glow effect for optimized chart
    if (isOptimized) {
      const defs = svg.append('defs');
      const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter.append('feGaussianBlur')
        .attr('stdDeviation', '4')
        .attr('result', 'coloredBlur');

      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Draw pie segments
    const segments = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');

    segments.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .style('stroke', isOptimized ? '#FFD700' : 'white')
      .style('stroke-width', isOptimized ? 3 : 2)
      .style('cursor', 'pointer')
      .style('filter', isOptimized ? 'url(#glow)' : 'none')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc(d));
        setHoveredSegment(d.data.channel);
        setHoveredData(d.data);
        setMousePosition({x: event.pageX, y: event.pageY});
      })
      .on('mousemove', function(event, d) {
        setMousePosition({x: event.pageX, y: event.pageY});
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc(d));
        setHoveredSegment(null);
        setHoveredData(null);
      });

    // Add percentage labels only for larger segments
    segments.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', isOptimized ? '13px' : '12px')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.7)')
      .text(d => d.data.percentage > 8 ? `${d.data.percentage.toFixed(0)}%` : '');

    // Add channel names for larger segments
    segments.append('text')
      .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x}, ${y + 15})`;
      })
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-weight', '600')
      .style('font-size', isOptimized ? '11px' : '10px')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.7)')
      .text(d => {
        if (d.data.percentage > 12) {
          // Abbreviate long channel names for space
          const channelAbbrev = d.data.channel
            .replace('Social Media Marketing', 'Social Media')
            .replace('SEO & Local Search', 'SEO/Local')
            .replace('Third-Party Delivery', '3rd Party')
            .replace('Direct/Walk-in', 'Direct');
          return channelAbbrev;
        }
        return '';
      });

    // Center text - use Month 12 data when available for consistency
    let displayRevenue;
    if (month12Data) {
      displayRevenue = isOptimized ? month12Data.optimized : month12Data.baseline;
    } else {
      displayRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    }

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', isOptimized ? '28px' : '24px')
      .style('font-weight', 'bold')
      .style('fill', isOptimized ? '#FFD700' : '#333')
      .text(`$${Math.round(displayRevenue).toLocaleString()}`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .style('font-size', '14px')
      .style('fill', '#666')
      .text('Monthly Revenue');

  };

  useEffect(() => {
    const currentData = calculateAttribution(false);
    const optimizedData = calculateAttribution(true);

    renderChart(currentChartRef, currentData, false);
    renderChart(optimizedChartRef, optimizedData, true);
  }, [monthlyRevenue, avgTicket, hasLoyaltyProgram, smsListSize, emailListSize,
      socialFollowers, thirdPartyPercentage, currentSEORevenue, leverStates, levers, month12Data]);

  const currentData = calculateAttribution(false);
  const optimizedData = calculateAttribution(true);

  // Scale data to match Month 12 projections when available
  const displayCurrentData = month12Data ? currentData.map(item => ({
    ...item,
    revenue: (item.revenue / currentData.reduce((sum, d) => sum + d.revenue, 0)) * month12Data.baseline,
    percentage: item.percentage
  })) : currentData;

  const displayOptimizedData = month12Data ? optimizedData.map(item => ({
    ...item,
    revenue: (item.revenue / optimizedData.reduce((sum, d) => sum + d.revenue, 0)) * month12Data.optimized,
    percentage: item.percentage
  })) : optimizedData;

  const totalOptimizedRevenue = optimizedData.reduce((sum, d) => sum + d.revenue, 0);

  // Use Month 12 data for growth potential when available, otherwise calculate from levers
  const actualGrowthPotential = month12Data
    ? month12Data.difference
    : levers.reduce((sum, lever) => {
        if (lever.isActive) {
          return sum + (lever.potentialRevenue - lever.currentRevenue);
        }
        return sum;
      }, 0);
  
  const growthPotential = actualGrowthPotential;
  const growthPercentage = (growthPotential / monthlyRevenue) * 100;
  const optimizedChartScale = getOptimizedChartScale();

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", position: 'relative' }}>
      {/* Custom Tooltip */}
      {hoveredData && (
        <div style={{
          position: 'fixed',
          left: mousePosition.x + 15,
          top: mousePosition.y - 10,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 10000,
          pointerEvents: 'none',
          maxWidth: '250px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: `2px solid ${hoveredData.color}`
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '6px',
            color: hoveredData.color,
            fontSize: '15px'
          }}>
            {hoveredData.channel}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Revenue:</strong> ${Math.round(hoveredData.revenue).toLocaleString()}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Percentage:</strong> {hoveredData.percentage.toFixed(1)}%
          </div>
          {hoveredData.details && (
            <div style={{ 
              fontSize: '12px', 
              color: '#ccc',
              marginTop: '8px',
              borderTop: '1px solid #444',
              paddingTop: '6px'
            }}>
              {hoveredData.details}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '10px'
        }}>
          💰 Your Revenue DNA
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '10px'
        }}>
          Current Reality vs. Optimized Potential
        </p>
        <p style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#10b981',
          margin: 0
        }}>
          Unlock ${Math.round(actualGrowthPotential).toLocaleString()} ({month12Data ? month12Data.percentageGrowth.toFixed(1) : ((actualGrowthPotential / monthlyRevenue) * 100).toFixed(1)}% growth)
        </p>
      </div>

      {/* 2x2 Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto',
        gap: '30px',
        marginBottom: '40px'
      }}>
        {/* Current Revenue Chart */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#334155',
            marginBottom: '20px'
          }}>
            Current Revenue DNA
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
            <svg ref={currentChartRef} width={480} height={400}></svg>
            
            {/* Legend for smaller segments */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              minWidth: '120px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Revenue Mix</div>
              {displayCurrentData.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                  opacity: hoveredSegment === item.channel ? 1 : (hoveredSegment ? 0.5 : 1),
                  transition: 'opacity 0.2s'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    marginRight: '6px',
                    flexShrink: 0
                  }} />
                  <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
                    <div style={{ fontWeight: '600' }}>{item.channel}</div>
                    <div style={{ color: '#666' }}>{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Summary under Current Chart */}
          {month12Data && (
            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              padding: '12px',
              background: 'rgba(248, 250, 252, 0.8)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '2px'
              }}>
                Without: ${(month12Data.baseline / 1000).toFixed(1)}k
              </div>
            </div>
          )}
        </div>

        {/* Optimized Revenue Chart - Premium Treatment */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: `0 12px ${20 + (levers.filter(l => l.isActive).length * 10)}px rgba(255,215,0,${0.3 + (levers.filter(l => l.isActive).length * 0.1)})`,
          border: `${2 + levers.filter(l => l.isActive).length}px solid #FFD700`,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Background glow effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, rgba(255,215,0,${0.1 + (levers.filter(l => l.isActive).length * 0.05)}) 0%, transparent 70%)`,
            animation: `pulse ${3 - (levers.filter(l => l.isActive).length * 0.3)}s ease-in-out infinite`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ 
            position: 'relative', 
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '20px'
            }}>
              {getOptimizedChartTitle()}
            </h3>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              width: '100%',
              height: '600px', // Fixed container height to prevent layout shifts
              overflow: 'visible' // Allow chart to grow beyond container
            }}>
              <div style={{ position: 'relative' }}>
                <svg 
                  ref={optimizedChartRef} 
                  width={480} 
                  height={400}
                  style={{
                    transform: `scale(${optimizedChartScale})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: `drop-shadow(0 8px 25px rgba(255,215,0,${0.3 + (levers.filter(l => l.isActive).length * 0.1)}))`,
                  }}
                ></svg>
                
                {/* Legend for optimized chart */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(255, 248, 237, 0.95)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '11px',
                  boxShadow: '0 2px 8px rgba(255,215,0,0.2)',
                  border: '1px solid #fbbf24',
                  minWidth: '120px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#92400e' }}>Optimized Mix</div>
                  {displayOptimizedData.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '4px',
                      opacity: hoveredSegment === item.channel ? 1 : (hoveredSegment ? 0.5 : 1),
                      transition: 'opacity 0.2s'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: item.color,
                        borderRadius: '50%',
                        marginRight: '6px',
                        flexShrink: 0
                      }} />
                      <div style={{ fontSize: '10px', lineHeight: '1.2' }}>
                        <div style={{ fontWeight: '600', color: '#92400e' }}>{item.channel}</div>
                        <div style={{ color: '#b45309' }}>{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Summary under Optimized Chart */}
          {month12Data && (
            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              padding: '12px',
              background: 'rgba(255, 248, 237, 0.8)',
              borderRadius: '8px',
              border: '2px solid #fbbf24'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '4px'
              }}>
                With Boostly: ${(month12Data.optimized / 1000).toFixed(1)}k
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#f59e0b'
              }}>
                +${(month12Data.difference / 1000).toFixed(1)}k (+{month12Data.percentageGrowth.toFixed(1)}%)
              </div>
            </div>
          )}
        </div>

        {/* Top Right: Monthly Forecast Chart */}
        <div style={{
          gridColumn: '2 / 3',
          gridRow: '1 / 2'
        }}>
          <MonthlyForecastChart
            currentRevenue={monthlyRevenue}
            leverStates={leverStates}
            monthlyGrowthPotential={growthPotential}
            restaurantData={restaurantData}
            leverData={levers.map(lever => ({
              id: lever.id,
              currentRevenue: lever.currentRevenue,
              potentialRevenue: lever.potentialRevenue,
              isActive: lever.isActive
            }))}
            onMonth12DataChange={setMonth12Data}
          />
        </div>

        {/* Bottom Right: Interactive Levers */}
        <div style={{
          gridColumn: '2 / 3',
          gridRow: '2 / 3'
        }}>
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        height: '100%'
      }}>
        <h3 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#334155',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ⚡ Interactive Revenue Levers
        </h3>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          Toggle the levers below to see real-time impact on your revenue potential
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' }}>
          {levers.map((lever) => (
            <div key={lever.id} style={{ textAlign: 'center', position: 'relative' }}>
              {/* Lever Name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '2rem', marginRight: '10px' }}>{lever.icon}</span>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#333',
                  margin: '0'
                }}>
                  {lever.name}
                </h3>
              </div>

              {/* Lever Switch */}
              <div 
                style={{
                  position: 'relative',
                  width: '60px',
                  height: '160px',
                  background: '#f0f0f0',
                  borderRadius: '30px',
                  margin: '0 auto 20px auto',
                  cursor: 'pointer',
                  border: '3px solid #ddd',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setLeverStates(prev => ({ ...prev, [lever.id]: !prev[lever.id] }))}
              >
                {/* Lever Track */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  width: 'calc(100% - 12px)',
                  height: 'calc(100% - 12px)',
                  background: lever.isActive ? `linear-gradient(to top, ${lever.color}, ${lever.color}dd)` : '#e0e0e0',
                  borderRadius: '24px',
                  transition: 'all 0.4s ease'
                }} />

                {/* Lever Handle */}
                <div style={{
                  position: 'absolute',
                  top: lever.isActive ? '10px' : 'calc(100% - 50px)', // UP when active, DOWN when inactive
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '70px',
                  height: '40px',
                  background: 'white',
                  borderRadius: '20px',
                  border: `3px solid ${lever.isActive ? lever.color : '#999'}`,
                  boxShadow: lever.isActive ? `0 6px 15px ${lever.color}40` : '0 6px 15px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '800',
                  color: lever.isActive ? lever.color : '#999',
                  transition: 'all 0.4s ease',
                  zIndex: 2
                }}>
                  {lever.isActive ? 'ON' : 'OFF'}
                </div>
              </div>

              {/* Status Display */}
              <div style={{
                textAlign: 'center',
                marginBottom: '15px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: lever.isActive ? lever.color : '#999',
                  padding: '8px 16px',
                  background: lever.isActive ? `${lever.color}20` : '#f5f5f5',
                  borderRadius: '20px',
                  border: `2px solid ${lever.isActive ? lever.color : '#ddd'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {lever.isActive ? '✓ WITH BOOSTLY' : '✗ WITHOUT BOOSTLY'}
                </div>
              </div>

              {/* Revenue Impact */}
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '15px',
                border: '2px solid #e9ecef'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: lever.isActive ? lever.color : '#666',
                  marginBottom: '5px'
                }}>
                  {/* Show the individual lever's contribution */}
                  +${Math.round(lever.potentialRevenue - lever.currentRevenue).toLocaleString()}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  monthly revenue boost
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      </div>

      {/* Channel Breakdown Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Current Breakdown */}
        <div>
          <h3 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#334155'
          }}>
            📊 Current Channel Breakdown
          </h3>
          {displayCurrentData.map((item) => (
            <div 
              key={item.channel}
              style={{ 
                marginBottom: '12px',
                padding: '15px',
                backgroundColor: hoveredSegment === item.channel ? '#e8f4f8' : 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: item.color,
                    borderRadius: '2px',
                    marginRight: '10px'
                  }}
                />
                <span style={{ fontWeight: '700', flex: 1, fontSize: '14px' }}>{item.channel}</span>
                <span style={{ fontWeight: '700', fontSize: '16px' }}>${Math.round(item.revenue).toLocaleString()}</span>
              </div>
              {item.details && (
                <div style={{ fontSize: '12px', color: '#64748b', marginLeft: '22px' }}>
                  {item.details}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Optimized Breakdown */}
        <div>
          <h3 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🚀 Optimized Channel Breakdown
          </h3>
          {displayOptimizedData.map((item) => (
            <div 
              key={item.channel}
              style={{ 
                marginBottom: '12px',
                padding: '15px',
                backgroundColor: hoveredSegment === item.channel ? '#fef3c7' : 'rgba(255,255,255,0.8)',
                borderRadius: '8px',
                border: '1px solid #fbbf24',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: item.color,
                    borderRadius: '2px',
                    marginRight: '10px'
                  }}
                />
                <span style={{ fontWeight: '700', flex: 1, fontSize: '14px' }}>{item.channel}</span>
                <span style={{ fontWeight: '700', fontSize: '16px' }}>${Math.round(item.revenue).toLocaleString()}</span>
              </div>
              {item.details && (
                <div style={{ fontSize: '12px', color: '#92400e', marginLeft: '22px' }}>
                  {item.details}
                </div>
              )}
            </div>
          ))}
          
          {/* Growth Summary */}
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '8px',
            color: 'white'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700' }}>
              💎 Revenue Growth Summary
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Additional Monthly Revenue:</span>
              <span style={{ fontWeight: '700' }}>
                +${month12Data ? Math.round(month12Data.difference).toLocaleString() : Math.round(actualGrowthPotential).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Growth Percentage:</span>
              <span style={{ fontWeight: '700' }}>
                {month12Data ? month12Data.percentageGrowth.toFixed(1) : ((actualGrowthPotential / monthlyRevenue) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Annual Revenue Impact:</span>
              <span style={{ fontWeight: '700' }}>
                ${month12Data ? Math.round(month12Data.optimized).toLocaleString() : Math.round(monthlyRevenue + actualGrowthPotential).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* CSS Animation for pulse effect */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default DualRevenueVisualization;