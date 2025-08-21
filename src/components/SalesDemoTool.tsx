import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { restaurantBenchmarks } from '../data/restaurantStats';
import { calculateUnifiedRevenue, KeywordData } from '../services/revenueCalculations';
import { RestaurantIntelligence } from '../services/placesAPI';
import AdvancedSEOCalculator from './AdvancedSEOCalculator';
import FloatingBubbles from './FloatingBubbles';
import RevenueLeverSystem from './RevenueLeverSystem';
import RevenueAttribution from './RevenueAttribution';
import ComprehensiveMetrics from './ComprehensiveMetrics';
import RestaurantSearch from './RestaurantSearch';
import TestPlaces from './TestPlaces';

interface RestaurantData {
  // Google Places integration
  placeId?: string;
  placeName?: string;
  placeAddress?: string;
  placeRating?: number;
  placeReviewCount?: number;
  placePhotoUrl?: string;
  isDataAutoDetected: boolean;
  
  // Core business metrics
  monthlyRevenue: number;
  avgTicket: number;
  monthlyTransactions: number;
  
  // Current marketing channels
  hasWebsite: boolean;
  website?: string;
  socialFollowersInstagram: number;
  socialFollowersFacebook: number;
  socialLinksDetected: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  postsPerWeek: number;
  emailListSize: number;
  smsListSize: number;
  currentLocalPackPosition: number;
  currentOrganicPosition: number;
  
  // Individual keyword data (preferred method)
  keywords: KeywordData[];
  keywordsAutoDetected: boolean;
  
  // Legacy: Keyword rankings by position (kept for backwards compatibility)
  localPackKeywords: {
    position1: number;
    position2: number;
    position3: number;
  };
  organicKeywords: {
    position1: number;
    position2: number;
    position3: number;
    position4: number;
    position5: number;
  };
  usesDirectMail: boolean;
  mailerFrequency: number; // per month
  usesThirdPartyDelivery: boolean;
  thirdPartyPercentage: number; // percentage of total revenue
  thirdPartyOrdersPerMonth: number; // alternative to percentage
}

interface ChannelGap {
  channel: string;
  currentRevenue: number;
  potentialRevenue: number;
  gap: number;
  confidence: 'High' | 'Medium' | 'Low';
  serviceOffered: boolean;
  color: string;
}

const SalesDemoTool: React.FC = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RestaurantData>({
    // Google Places integration
    placeId: undefined,
    placeName: undefined,
    placeAddress: undefined,
    placeRating: undefined,
    placeReviewCount: undefined,
    placePhotoUrl: undefined,
    isDataAutoDetected: false,
    
    // Core business metrics (start with defaults for demo)
    monthlyRevenue: 75000,
    avgTicket: 25,
    monthlyTransactions: 3000,
    
    // Current marketing channels
    hasWebsite: true,
    website: undefined,
    socialFollowersInstagram: 0,
    socialFollowersFacebook: 0,
    socialLinksDetected: {},
    postsPerWeek: 0,
    emailListSize: 0,
    smsListSize: 0,
    currentLocalPackPosition: 4,
    currentOrganicPosition: 8,
    
    // Individual keyword data
    keywords: [
      // Pre-populate with some example keywords (will be replaced with real data)
      { keyword: "pizza delivery near me", searchVolume: 2000, currentPosition: 4, targetPosition: 1, isLocalPack: true },
      { keyword: "best pizza [city]", searchVolume: 800, currentPosition: 6, targetPosition: 2, isLocalPack: true },
      { keyword: "pizza restaurant", searchVolume: 1200, currentPosition: 8, targetPosition: 3, isLocalPack: false }
    ],
    keywordsAutoDetected: false,
    
    // Legacy keyword data
    localPackKeywords: {
      position1: 0,
      position2: 0,
      position3: 0
    },
    organicKeywords: {
      position1: 0,
      position2: 0,
      position3: 0,
      position4: 0,
      position5: 0
    },
    usesDirectMail: false,
    mailerFrequency: 0,
    usesThirdPartyDelivery: false,
    thirdPartyPercentage: 0,
    thirdPartyOrdersPerMonth: 0
  });

  const [gaps, setGaps] = useState<ChannelGap[]>([]);
  const [seoROI, setSeoROI] = useState(0);
  const [seoBreakdown, setSeoBreakdown] = useState<any>(null);

  // Handle restaurant selection from Places API
  const handleRestaurantSelected = (intelligence: RestaurantIntelligence) => {
    const placeDetails = intelligence.placeDetails;
    
    setData({
      ...data,
      // Google Places data
      placeId: placeDetails.place_id,
      placeName: placeDetails.name,
      placeAddress: placeDetails.formatted_address,
      placeRating: placeDetails.rating,
      placeReviewCount: placeDetails.user_ratings_total,
      placePhotoUrl: placeDetails.photos?.[0]?.photo_reference,
      website: placeDetails.website,
      isDataAutoDetected: true,
      
      // Auto-populated business metrics
      monthlyRevenue: intelligence.estimatedMonthlyRevenue,
      avgTicket: intelligence.estimatedAvgTicket,
      monthlyTransactions: intelligence.estimatedMonthlyTransactions,
      
      // Social media links (from your future API integration)
      socialLinksDetected: intelligence.socialMediaLinks,
      
      // TODO: Add keyword auto-detection here when you integrate your SEO APIs
      keywordsAutoDetected: false
    });
    
    // Move to the next step (manual data entry/confirmation)
    setStep(2);
  };

  const handleSkipRestaurantSearch = () => {
    // Keep existing manual data entry flow
    setStep(2);
  };

  const handleSEOCalculation = (roi: number, breakdown: any) => {
    setSeoROI(roi);
    setSeoBreakdown(breakdown);
  };

  const calculateChannelGaps = () => {
    // Use unified revenue calculations
    const restaurantDataForCalc = {
      monthlyRevenue: data.monthlyRevenue,
      avgTicket: data.avgTicket,
      monthlyTransactions: Math.round(data.monthlyRevenue / data.avgTicket),
      keywords: data.keywords,
      currentLocalPackPosition: data.currentLocalPackPosition,
      currentOrganicPosition: data.currentOrganicPosition,
      socialFollowersInstagram: data.socialFollowersInstagram,
      socialFollowersFacebook: data.socialFollowersFacebook,
      emailListSize: data.emailListSize,
      smsListSize: data.smsListSize,
      localPackKeywords: data.localPackKeywords,
      organicKeywords: data.organicKeywords
    };

    const unifiedCalcs = calculateUnifiedRevenue(restaurantDataForCalc);
    
    // Email calculations (not part of main 3 services)
    const potentialSMSList = Math.round(data.monthlyRevenue / data.avgTicket) * 0.3;
    const emailPotential = potentialSMSList * (restaurantBenchmarks.email.openRate / 100) * (restaurantBenchmarks.email.clickRate / 100) * (restaurantBenchmarks.email.conversionRate / 100) * data.avgTicket * 8;
    const currentEmailRevenue = data.emailListSize * (restaurantBenchmarks.email.openRate / 100) * (restaurantBenchmarks.email.clickRate / 100) * (restaurantBenchmarks.email.conversionRate / 100) * data.avgTicket * 8;

    const channelGaps: ChannelGap[] = [
      {
        channel: 'SEO & Local Search',
        currentRevenue: unifiedCalcs.seo.currentRevenue,
        potentialRevenue: unifiedCalcs.seo.potentialRevenue,
        gap: unifiedCalcs.seo.additionalRevenue,
        confidence: 'High',
        serviceOffered: true,
        color: '#4CAF50'
      },
      {
        channel: 'Social Media Marketing',
        currentRevenue: unifiedCalcs.social.currentRevenue,
        potentialRevenue: unifiedCalcs.social.potentialRevenue,
        gap: unifiedCalcs.social.additionalRevenue,
        confidence: 'High',
        serviceOffered: true,
        color: '#E91E63'
      },
      {
        channel: 'SMS Marketing',
        currentRevenue: unifiedCalcs.sms.currentRevenue,
        potentialRevenue: unifiedCalcs.sms.potentialRevenue,
        gap: unifiedCalcs.sms.additionalRevenue,
        confidence: 'High',
        serviceOffered: true,
        color: '#2196F3'
      },
      {
        channel: 'Email Marketing',
        currentRevenue: currentEmailRevenue,
        potentialRevenue: emailPotential,
        gap: emailPotential - currentEmailRevenue,
        confidence: 'Medium',
        serviceOffered: false,
        color: '#FF9800'
      },
      {
        channel: 'Word of Mouth',
        currentRevenue: data.monthlyRevenue * 0.4, // Assuming 40% is word of mouth
        potentialRevenue: data.monthlyRevenue * 0.4,
        gap: 0,
        confidence: 'Low',
        serviceOffered: false,
        color: '#9E9E9E'
      }
    ];

    setGaps(channelGaps);
  };

  useEffect(() => {
    calculateChannelGaps();
  }, [data, seoROI]);

  const totalGap = gaps.filter(g => g.serviceOffered).reduce((sum, gap) => sum + gap.gap, 0);
  const totalPotential = gaps.reduce((sum, gap) => sum + gap.potentialRevenue, 0);

  if (step === 1) {
    return (
      <div>
        <TestPlaces />
        <RestaurantSearch 
          onRestaurantSelected={handleRestaurantSelected}
          onSkip={handleSkipRestaurantSearch}
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
        padding: '40px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating Bubbles with Restaurant Facts */}
        <FloatingBubbles />
        
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '30px',
            padding: '60px 50px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(139, 156, 244, 0.1)',
              border: '2px solid rgba(139, 156, 244, 0.3)',
              borderRadius: '8px',
              padding: '8px 20px',
              marginBottom: '40px',
              color: '#8b9cf4',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              ● LIVE • ENTERPRISE REVENUE INTELLIGENCE
            </div>

            <h1 style={{
              fontSize: '3.2rem',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '25px',
              lineHeight: '1.1',
              letterSpacing: '-0.02em'
            }}>
              Revenue Gap Analysis
            </h1>
            
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              marginBottom: '50px',
              lineHeight: '1.6',
              maxWidth: '600px',
              margin: '0 auto 50px auto',
              fontWeight: '400'
            }}>
              Comprehensive marketing channel assessment with <strong>quantified opportunity identification</strong> and competitive benchmarking
            </p>

            {/* Enterprise Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '20px',
              marginBottom: '50px'
            }}>
              <div style={{
                background: 'white',
                border: '2px solid #f0f0f0',
                color: '#333',
                padding: '25px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '8px', color: '#e74c3c' }}>98%</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>SMS Open Rate</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Industry benchmark</div>
              </div>

              <div style={{
                background: 'white',
                border: '2px solid #f0f0f0',
                color: '#333',
                padding: '25px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '8px', color: '#27ae60' }}>33%</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Local Pack Position #1 CTR</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>vs 18% Organic Position #1</div>
              </div>

              <div style={{
                background: 'white',
                border: '2px solid #f0f0f0',
                color: '#333',
                padding: '25px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '8px', color: '#8b9cf4' }}>$15K</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Avg. Monthly Opportunity</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Per location analyzed</div>
              </div>
            </div>

            {/* Input Section with Better Design */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '30px',
              marginBottom: '40px',
              textAlign: 'left'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Monthly Revenue
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#666',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    $
                  </span>
                  <input
                    type="text"
                    value={data.monthlyRevenue || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setData({...data, monthlyRevenue: Number(value) || 0});
                    }}
                    style={{
                      width: '100%',
                      padding: '18px 24px 18px 45px',
                      border: '3px solid #f0f0f0',
                      borderRadius: '15px',
                      fontSize: '20px',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      background: '#fafafa'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8b9cf4';
                      e.target.style.background = 'white';
                      e.target.style.transform = 'scale(1.02)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#f0f0f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.transform = 'scale(1)';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Average Ticket Size
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#666',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    $
                  </span>
                  <input
                    type="text"
                    value={data.avgTicket || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setData({...data, avgTicket: Number(value) || 0});
                    }}
                    style={{
                      width: '100%',
                      padding: '18px 24px 18px 45px',
                      border: '3px solid #f0f0f0',
                      borderRadius: '15px',
                      fontSize: '20px',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      background: '#fafafa'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8b9cf4';
                      e.target.style.background = 'white';
                      e.target.style.transform = 'scale(1.02)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#f0f0f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.transform = 'scale(1)';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Calculated Transaction Display */}
            <div style={{ 
              background: '#f8f9fa',
              border: '2px solid #e9ecef',
              padding: '30px',
              borderRadius: '12px',
              marginBottom: '40px'
            }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#666',
                marginBottom: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Calculated Monthly Volume
              </p>
              <p style={{
                fontSize: '2.8rem',
                fontWeight: '800',
                color: '#1a1a1a',
                margin: '0 0 5px 0'
              }}>
                {Math.round(data.monthlyRevenue / data.avgTicket).toLocaleString()}
              </p>
              <p style={{ 
                fontSize: '16px', 
                color: '#666',
                margin: '0',
                fontWeight: '500'
              }}>
                transactions per month
              </p>
            </div>

            <button
              onClick={() => setStep(3)}
              style={{
                background: '#1a1a1a',
                color: 'white',
                border: '2px solid #1a1a1a',
                padding: '18px 50px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1a1a1a';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a1a1a';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Begin Analysis →
            </button>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '30px',
              marginTop: '25px',
              fontSize: '12px',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <span>• Enterprise Grade</span>
              <span>• Real-Time Data</span>
              <span>• 500+ Locations Analyzed</span>
            </div>
          </div>
        </div>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.8; }
            }
          `}
        </style>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
        padding: '40px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '50px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#333',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              Current Marketing Assessment
            </h2>
            
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              marginBottom: '40px',
              textAlign: 'center'
            }}>
              Help us understand your current marketing channels
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <h3 style={{ color: '#333', marginBottom: '25px', fontSize: '1.4rem' }}>Social Media</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Instagram Followers
                  </label>
                  <input
                    type="number"
                    value={data.socialFollowersInstagram || ''}
                    onChange={(e) => setData({...data, socialFollowersInstagram: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Facebook Followers
                  </label>
                  <input
                    type="number"
                    value={data.socialFollowersFacebook || ''}
                    onChange={(e) => setData({...data, socialFollowersFacebook: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Posts Per Week
                  </label>
                  <input
                    type="number"
                    value={data.postsPerWeek || ''}
                    onChange={(e) => setData({...data, postsPerWeek: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 style={{ color: '#333', marginBottom: '25px', fontSize: '1.4rem' }}>Other Channels</h3>
                
                {/* Manual Keyword Data Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#333', marginBottom: '15px', fontSize: '1.2rem' }}>Your Keywords (Manual Entry)</h4>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                    Enter your specific keywords with search volumes for accurate SEO revenue calculations.
                  </p>
                  
                  {data.keywords.map((keyword, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 40px',
                      gap: '10px',
                      alignItems: 'center',
                      marginBottom: '10px',
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <input
                        type="text"
                        placeholder="e.g. pizza delivery near me"
                        value={keyword.keyword}
                        onChange={(e) => {
                          const newKeywords = [...data.keywords];
                          newKeywords[index].keyword = e.target.value;
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      
                      <input
                        type="number"
                        placeholder="Search Vol"
                        value={keyword.searchVolume || ''}
                        onChange={(e) => {
                          const newKeywords = [...data.keywords];
                          newKeywords[index].searchVolume = Number(e.target.value) || 0;
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      
                      <select
                        value={keyword.currentPosition}
                        onChange={(e) => {
                          const newKeywords = [...data.keywords];
                          newKeywords[index].currentPosition = Number(e.target.value);
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        {[...Array(15)].map((_, i) => (
                          <option key={i+1} value={i+1}>Pos {i+1}</option>
                        ))}
                      </select>
                      
                      <select
                        value={keyword.targetPosition}
                        onChange={(e) => {
                          const newKeywords = [...data.keywords];
                          newKeywords[index].targetPosition = Number(e.target.value);
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        {[1, 2, 3, 4, 5].map(pos => (
                          <option key={pos} value={pos}>#{pos}</option>
                        ))}
                      </select>
                      
                      <select
                        value={keyword.isLocalPack ? 'local' : 'organic'}
                        onChange={(e) => {
                          const newKeywords = [...data.keywords];
                          newKeywords[index].isLocalPack = e.target.value === 'local';
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="local">Local</option>
                        <option value="organic">Organic</option>
                      </select>
                      
                      <button
                        onClick={() => {
                          const newKeywords = data.keywords.filter((_, i) => i !== index);
                          setData({...data, keywords: newKeywords});
                        }}
                        style={{
                          padding: '8px',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          background: '#dc3545',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setData({...data, keywords: [...data.keywords, {
                        keyword: "",
                        searchVolume: 0,
                        currentPosition: 5,
                        targetPosition: 1,
                        isLocalPack: true
                      }]});
                    }}
                    style={{
                      padding: '10px 20px',
                      border: '2px dashed #28a745',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: '#28a745',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Keyword
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Email List Size
                  </label>
                  <input
                    type="number"
                    value={data.emailListSize || ''}
                    onChange={(e) => setData({...data, emailListSize: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    SMS List Size
                  </label>
                  <input
                    type="number"
                    value={data.smsListSize || ''}
                    onChange={(e) => setData({...data, smsListSize: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Direct Mail Frequency (per month)
                  </label>
                  <input
                    type="number"
                    value={data.mailerFrequency || ''}
                    onChange={(e) => setData({...data, mailerFrequency: Number(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '16px', fontWeight: '600', color: '#555' }}>
                    <input
                      type="checkbox"
                      checked={data.usesThirdPartyDelivery}
                      onChange={(e) => setData({...data, usesThirdPartyDelivery: e.target.checked, thirdPartyPercentage: e.target.checked ? 20 : 0, thirdPartyOrdersPerMonth: e.target.checked ? 300 : 0})}
                      style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                    />
                    Uses Third-Party Delivery (DoorDash, Uber Eats, etc.)
                  </label>
                </div>

                {data.usesThirdPartyDelivery && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                      Third-Party Delivery Orders per Month
                    </label>
                    <input
                      type="number"
                      value={data.thirdPartyOrdersPerMonth || ''}
                      onChange={(e) => {
                        const orders = Number(e.target.value) || 0;
                        const revenue = orders * data.avgTicket;
                        const percentage = (revenue / data.monthlyRevenue) * 100;
                        setData({...data, thirdPartyOrdersPerMonth: orders, thirdPartyPercentage: Math.min(100, percentage)});
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e1e5e9',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                      min="0"
                      placeholder="e.g. 300"
                    />
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      Industry average: 4.6 orders per user/month. Consider your app downloads/active users.
                    </small>
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                onClick={() => setStep(3)}
                style={{
                  background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '18px 50px',
                  borderRadius: '50px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(139, 156, 244, 0.4)',
                  transition: 'transform 0.3s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Show My Revenue Opportunities →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Step 1: Current State - Revenue Attribution Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            💰 Your Revenue DNA
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '25px'
          }}>
            Every dollar tells a story. Here's yours.
          </p>
          <RevenueAttribution
            monthlyRevenue={data.monthlyRevenue}
            avgTicket={data.avgTicket}
            localPackPosition={data.currentLocalPackPosition}
            organicPosition={data.currentOrganicPosition}
            localPackKeywords={data.localPackKeywords}
            organicKeywords={data.organicKeywords}
            hasLoyaltyProgram={false}
            smsListSize={data.smsListSize}
            emailListSize={data.emailListSize}
            socialFollowers={data.socialFollowersInstagram + data.socialFollowersFacebook}
            thirdPartyPercentage={data.usesThirdPartyDelivery ? data.thirdPartyPercentage : 0}
          />
        </div>

        {/* Step 2: Industry Benchmarks - Comprehensive Marketing Metrics */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            🚀 What Top Performers Know
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '25px'
          }}>
            Industry secrets that separate winners from everyone else.
          </p>
          <ComprehensiveMetrics />
        </div>

        {/* Step 3: The Opportunity - Interactive Revenue Lever System */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            ⚡ Your Hidden Revenue Levers
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            textAlign: 'center',
            marginBottom: '25px'
          }}>
            Pull the right levers. Watch your revenue transform.
          </p>
          <RevenueLeverSystem 
            monthlyRevenue={data.monthlyRevenue}
            avgTicket={data.avgTicket}
            monthlyTransactions={Math.round(data.monthlyRevenue / data.avgTicket)}
            restaurantData={{
              monthlyRevenue: data.monthlyRevenue,
              avgTicket: data.avgTicket,
              monthlyTransactions: Math.round(data.monthlyRevenue / data.avgTicket),
              keywords: data.keywords,
              currentLocalPackPosition: data.currentLocalPackPosition,
              currentOrganicPosition: data.currentOrganicPosition,
              socialFollowersInstagram: data.socialFollowersInstagram,
              socialFollowersFacebook: data.socialFollowersFacebook,
              emailListSize: data.emailListSize,
              smsListSize: data.smsListSize,
              localPackKeywords: data.localPackKeywords,
              organicKeywords: data.organicKeywords
            }}
          />
        </div>

        {/* Step 4: Summary - The Bottom Line */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '30px'
          }}>
            💎 Your Million Dollar Moment
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '20px',
              borderRadius: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>Current Monthly Revenue</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0' }}>
                ${data.monthlyRevenue.toLocaleString()}
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '20px',
              borderRadius: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>Potential Additional Revenue</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0' }}>
                +${Math.round(totalGap).toLocaleString()}
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '20px',
              borderRadius: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>Revenue Growth Potential</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0' }}>
                {Math.round((totalGap / data.monthlyRevenue) * 100)}%
              </p>
            </div>
          </div>

        </div>

        {/* Methodology Overview */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            📊 How We Calculate Your Revenue Opportunities
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '30px'
          }}>
            <div style={{
              background: '#f8f9fa',
              padding: '25px',
              borderRadius: '15px',
              border: '2px solid #e9ecef'
            }}>
              <h4 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#4CAF50',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center'
              }}>
                🔍 SEO & Local Search Attribution
              </h4>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#333',
                margin: '0'
              }}>
                We use the industry-standard <strong>70% Local Pack / 30% Organic search</strong> traffic split. 
                Position-specific CTR rates from Google studies: Local Pack #1 (33%), #2 (22%), #3 (13%). 
                Organic #1 (18%), #2 (7%), #3 (3%). Applied to your estimated search volume with 5% conversion rate.
              </p>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '25px',
              borderRadius: '15px',
              border: '2px solid #e9ecef'
            }}>
              <h4 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#2196F3',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center'
              }}>
                💬 SMS Marketing ROI
              </h4>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#333',
                margin: '0'
              }}>
                Based on F&B industry's <strong>98% SMS open rate</strong> (highest of any channel), 19-20% CTR, 
                and 25% conversion. Assumes 30% opt-in rate from your customer base. 
                SMS delivers <strong>10x higher redemption</strong> than traditional coupons.
              </p>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
            color: 'white',
            padding: '25px',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h4 style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              marginBottom: '15px',
              margin: '0 0 15px 0'
            }}>
              📈 Data Sources & Validation
            </h4>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0',
              opacity: '0.95'
            }}>
              All calculations based on 2024 industry reports: Google Local Search Study, SMS Marketing Benchmark Report, 
              Restaurant Social Media Analysis, and Mobile Marketing Association F&B data. 
              Methodology validated across <strong>500+ restaurant locations</strong> in our client base.
            </p>
          </div>
        </div>

        {/* Advanced SEO Analysis */}
        <AdvancedSEOCalculator 
          avgTicket={data.avgTicket}
          onROICalculated={handleSEOCalculation}
        />

        {/* Channel Gap Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#333', marginBottom: '30px' }}>
            Marketing Channel Performance vs. Industry Potential
          </h3>

          {gaps.map((gap, index) => (
            <div key={gap.channel} style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 150px 100px',
              alignItems: 'center',
              padding: '20px 0',
              borderBottom: index < gaps.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '5px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: gap.color,
                    marginRight: '10px'
                  }}></div>
                  <span style={{ fontWeight: '600', color: '#333' }}>{gap.channel}</span>
                  {gap.serviceOffered && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      We Offer
                    </span>
                  )}
                </div>
              </div>

              <div style={{ position: 'relative', height: '40px' }}>
                {/* Current Performance Bar */}
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  height: '18px',
                  width: `${Math.min((gap.currentRevenue / totalPotential) * 100, 100)}%`,
                  backgroundColor: gap.color,
                  borderRadius: '9px',
                  opacity: 0.7
                }}></div>
                
                {/* Potential Performance Bar */}
                <div style={{
                  position: 'absolute',
                  top: '22px',
                  left: '0',
                  height: '18px',
                  width: `${Math.min((gap.potentialRevenue / totalPotential) * 100, 100)}%`,
                  backgroundColor: gap.color,
                  borderRadius: '9px',
                  opacity: 0.3,
                  border: `2px solid ${gap.color}`
                }}></div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  ${Math.round(gap.currentRevenue).toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  / ${Math.round(gap.potentialRevenue).toLocaleString()}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {gap.gap > 0 && (
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: gap.serviceOffered ? '#4CAF50' : '#FF9800'
                  }}>
                    +${Math.round(gap.gap).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Service Recommendations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px'
        }}>
          {gaps.filter(g => g.serviceOffered && g.gap > 0).map(gap => (
            <div key={gap.channel} style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              border: `3px solid ${gap.color}`,
              textAlign: 'center'
            }}>
              <h4 style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#333',
                marginBottom: '15px'
              }}>
                {gap.channel}
              </h4>
              
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: gap.color,
                marginBottom: '10px'
              }}>
                +${Math.round(gap.gap).toLocaleString()}
              </div>
              
              <p style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '20px'
              }}>
                Additional monthly revenue potential
              </p>

              <div style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: '#333'
              }}>
                ${Math.round(gap.gap * 12).toLocaleString()}/year
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginTop: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#333',
            marginBottom: '20px'
          }}>
            Ready to Capture This Revenue?
          </h3>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#666',
            marginBottom: '30px'
          }}>
            We specialize in SEO, Social Media Marketing, and SMS campaigns that deliver these exact results.
          </p>

          <button
            onClick={() => setStep(2)}
            style={{
              background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
              color: 'white',
              border: 'none',
              padding: '20px 60px',
              borderRadius: '50px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
              marginRight: '20px',
              outline: 'none'
            }}
          >
            Schedule Strategy Call
          </button>

          <button
            onClick={() => setStep(2)}
            style={{
              background: 'transparent',
              color: '#8b9cf4',
              border: '2px solid #8b9cf4',
              padding: '20px 60px',
              borderRadius: '50px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            Analyze Another Restaurant
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesDemoTool;