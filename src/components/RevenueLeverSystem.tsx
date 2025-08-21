import React, { useState, useEffect, useMemo } from 'react';
import { channelROICalculators } from '../data/restaurantStats';
import { calculateUnifiedRevenue, RevenueCalculationInputs } from '../services/revenueCalculations';
import { useCountUp } from '../hooks/useCountUp';

interface LeverData {
  id: string;
  name: string;
  isActive: boolean; // true = using our service, false = not using
  currentRevenue: number;
  potentialRevenue: number;
  color: string;
  icon: string;
  methodology: string;
  dataSource: string;
}

interface RevenueLeverSystemProps {
  monthlyRevenue: number;
  avgTicket: number;
  monthlyTransactions: number;
  restaurantData?: RevenueCalculationInputs;
}

const RevenueLeverSystem: React.FC<RevenueLeverSystemProps> = ({
  monthlyRevenue,
  avgTicket,
  monthlyTransactions,
  restaurantData
}) => {
  const [showMethodology, setShowMethodology] = useState<string | null>(null);

  const leverCalculations = useMemo(() => {
    // Use unified calculations if restaurant data is provided
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
      // Fallback to original calculations
      seoCurrentRevenue = monthlyRevenue * 0.1;
      seoPotentialRevenue = channelROICalculators.calculateSEOROI(monthlyTransactions * 2.5, 5, 1, avgTicket) + seoCurrentRevenue;
      
      socialCurrentRevenue = monthlyRevenue * 0.05;
      socialPotentialRevenue = socialCurrentRevenue + (monthlyTransactions * 0.15 * avgTicket);
      
      smsCurrentRevenue = 0;
      smsPotentialRevenue = channelROICalculators.calculateSMSROI(monthlyTransactions * 0.3, 4, avgTicket);
    }

    return [
      {
        id: 'seo',
        name: 'SEO & Local Search',
        isActive: false,
        currentRevenue: seoCurrentRevenue,
        potentialRevenue: seoPotentialRevenue,
        color: '#4CAF50',
        icon: '🔍',
        methodology: 'Based on Local Pack vs Organic search attribution (70%/30% split) and position-specific CTR: Local Pack Position #1 (33% CTR), #2 (22% CTR), #3 (13% CTR). Organic Search Position #1 (18% CTR), #2 (7% CTR), #3 (3% CTR). Uses 5% website conversion rate and 2.5x search volume multiplier.',
        dataSource: 'Google Local Search Study 2024, Local SEO Click-Through Rate Analysis, Restaurant Industry Benchmarks'
      },
      {
        id: 'social',
        name: 'Social Media Marketing',
        isActive: false,
        currentRevenue: socialCurrentRevenue,
        potentialRevenue: socialPotentialRevenue,
        color: '#E91E63',
        icon: '📱',
        methodology: 'Calculated using realistic follower-to-customer conversion rates, with Instagram performing at 1.5% monthly conversion and Facebook at 0.5%. Accounts for posting frequency impact and content strategy optimization.',
        dataSource: 'Restaurant Social Media Report 2024, Platform-specific engagement studies, Food & Beverage industry analysis'
      },
      {
        id: 'sms',
        name: 'SMS Marketing',
        isActive: false,
        currentRevenue: smsCurrentRevenue,
        potentialRevenue: smsPotentialRevenue,
        color: '#2196F3',
        icon: '💬',
        methodology: 'Based on 98% SMS open rate (highest in F&B sector), 19-20% click-through rate, and 25% conversion rate. Assumes 30% of customers would opt-in to SMS marketing with 4 campaigns per month. 10x higher redemption vs other channels.',
        dataSource: 'SMS Marketing Benchmark Report, Mobile Marketing Association F&B data, Redemption rate studies'
      }
    ];
  }, [monthlyRevenue, avgTicket, monthlyTransactions, restaurantData?.monthlyRevenue, restaurantData?.avgTicket, restaurantData?.monthlyTransactions, restaurantData?.keywords, restaurantData?.socialFollowersInstagram, restaurantData?.socialFollowersFacebook, restaurantData?.smsListSize]);

  const [leverStates, setLeverStates] = useState<{[key: string]: boolean}>({});
  
  // Combine calculations with toggle states
  const levers = useMemo(() => 
    leverCalculations.map(lever => ({
      ...lever,
      isActive: leverStates[lever.id] ?? false
    })), 
    [leverCalculations, leverStates]
  );

  const toggleLever = (leverId: string) => {
    console.log('Toggling lever:', leverId);
    setLeverStates(prev => ({
      ...prev,
      [leverId]: !prev[leverId]
    }));
  };

  const calculateCurrentRevenue = (lever: LeverData) => {
    return lever.isActive ? lever.potentialRevenue : lever.currentRevenue;
  };

  const calculateMissingRevenue = (lever: LeverData) => {
    return lever.isActive ? 0 : (lever.potentialRevenue - lever.currentRevenue);
  };

  const totals = useMemo(() => {
    const totalCurrentRevenue = levers.length > 0 ? levers.reduce((sum, lever) => sum + calculateCurrentRevenue(lever), 0) : 0;
    const totalPotentialRevenue = levers.length > 0 ? levers.reduce((sum, lever) => sum + lever.potentialRevenue, 0) : 0;
    const totalMissing = totalPotentialRevenue - totalCurrentRevenue;
    
    return {
      current: totalCurrentRevenue,
      potential: totalPotentialRevenue,
      missing: totalMissing
    };
  }, [levers]);

  // Animated values for smooth transitions
  const animatedCurrentRevenue = useCountUp(totals.current, { duration: 1200 });
  const animatedPotentialRevenue = useCountUp(totals.potential, { duration: 1200 });
  const animatedMissingRevenue = useCountUp(totals.missing, { duration: 1200 });

  // Helper component for animated numbers
  const AnimatedNumber: React.FC<{ value: number; lever: LeverData; type: 'current' | 'missing' | 'potential' }> = ({ value, lever, type }) => {
    const targetValue = type === 'current' ? calculateCurrentRevenue(lever) : 
                      type === 'missing' ? calculateMissingRevenue(lever) : 
                      lever.potentialRevenue;
    const animatedValue = useCountUp(targetValue, { duration: 1200 });
    return <>{Math.round(animatedValue).toLocaleString()}</>;
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '30px',
      padding: '50px',
      boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '15px'
        }}>
          Flip the Switch. See the Impact.
        </h2>
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '30px'
        }}>
          Click each lever to activate Boostly services and watch your revenue transform
        </p>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            padding: '25px',
            borderRadius: '15px',
            border: '2px solid #dee2e6'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Current Revenue</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#333' }}>
              ${Math.round(animatedCurrentRevenue).toLocaleString()}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
            padding: '25px',
            borderRadius: '15px',
            border: '2px solid #ffc107'
          }}>
            <div style={{ fontSize: '14px', color: '#856404', marginBottom: '5px' }}>Missing Revenue</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#856404' }}>
              ${Math.round(animatedMissingRevenue).toLocaleString()}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
            padding: '25px',
            borderRadius: '15px',
            border: '2px solid #28a745'
          }}>
            <div style={{ fontSize: '14px', color: '#155724', marginBottom: '5px' }}>Full Potential</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#155724' }}>
              ${Math.round(animatedPotentialRevenue).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Levers */}
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
              <div
                style={{
                  marginLeft: '10px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#666',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setShowMethodology(showMethodology === lever.id ? null : lever.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = lever.color;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.color = '#666';
                }}
              >
                ?
              </div>
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
              onClick={() => toggleLever(lever.id)}
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
                {lever.isActive ? '✓ WITH OUR SERVICE' : '✗ WITHOUT OUR SERVICE'}
              </div>
            </div>

            {/* Revenue Display */}
            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '15px',
              border: '2px solid #e9ecef'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Current</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#333' }}>
                  $<AnimatedNumber value={calculateCurrentRevenue(lever)} lever={lever} type="current" />
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#856404', marginBottom: '3px' }}>Missing</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#856404' }}>
                  $<AnimatedNumber value={calculateMissingRevenue(lever)} lever={lever} type="missing" />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#155724', marginBottom: '3px' }}>Potential</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#155724' }}>
                  $<AnimatedNumber value={lever.potentialRevenue} lever={lever} type="potential" />
                </div>
              </div>
            </div>

            {/* Methodology Popup */}
            {showMethodology === lever.id && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '350px',
                background: 'white',
                border: `3px solid ${lever.color}`,
                borderRadius: '15px',
                padding: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                zIndex: 1000,
                marginTop: '10px'
              }}>
                <h4 style={{
                  margin: '0 0 15px 0',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: lever.color
                }}>
                  How We Calculate This
                </h4>
                <p style={{
                  margin: '0 0 15px 0',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  color: '#333'
                }}>
                  {lever.methodology}
                </p>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  fontStyle: 'italic',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '10px'
                }}>
                  <strong>Data Sources:</strong> {lever.dataSource}
                </div>
                <button
                  onClick={() => setShowMethodology(null)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '15px',
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        padding: '20px',
        background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
        borderRadius: '15px',
        color: 'white'
      }}>
        <p style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600' }}>
          💡 Click the levers to toggle our services ON/OFF and see the revenue impact • Click ? for methodology
        </p>
      </div>
    </div>
  );
};

export default RevenueLeverSystem;