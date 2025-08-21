import { channelROICalculators, restaurantBenchmarks } from '../data/restaurantStats';

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  currentPosition: number;
  targetPosition: number;
  isLocalPack: boolean; // true for Local Pack, false for Organic
}

export interface RevenueCalculationInputs {
  monthlyRevenue: number;
  avgTicket: number;
  monthlyTransactions: number;
  
  // Individual keyword data (preferred method)
  keywords?: KeywordData[];
  
  // Fallback: Current positions (used if keywords array not provided)
  currentLocalPackPosition?: number;
  currentOrganicPosition?: number;
  
  // Current marketing assets
  socialFollowersInstagram: number;
  socialFollowersFacebook: number;
  emailListSize: number;
  smsListSize: number;
  
  // Legacy optional inputs (kept for backwards compatibility)
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
}

export interface ServiceRevenue {
  currentRevenue: number;
  potentialRevenue: number;
  additionalRevenue: number;
}

export interface RevenueCalculationResult {
  seo: ServiceRevenue;
  social: ServiceRevenue;
  sms: ServiceRevenue;
  totalAdditionalRevenue: number;
}

function calculateKeywordSEORevenue(keywords: KeywordData[], avgTicket: number): { current: number; potential: number } {
  let currentRevenue = 0;
  let potentialRevenue = 0;
  
  keywords.forEach(keyword => {
    // Get CTR based on position and type (Local Pack vs Organic)
    const getCurrentCTR = (position: number, isLocalPack: boolean): number => {
      if (isLocalPack) {
        const localPackCTR = restaurantBenchmarks.seo.localPackCTR.find(p => p.position === position);
        return localPackCTR ? localPackCTR.ctr : (position <= 3 ? 5 : 0);
      } else {
        const organicCTR = restaurantBenchmarks.seo.organicCTR.find(p => p.position === position);
        return organicCTR ? organicCTR.ctr : (position <= 10 ? Math.max(1.5 - (position * 0.2), 0.1) : 0.1);
      }
    };
    
    const currentCTR = getCurrentCTR(keyword.currentPosition, keyword.isLocalPack);
    const targetCTR = getCurrentCTR(keyword.targetPosition, keyword.isLocalPack);
    
    const conversionRate = restaurantBenchmarks.seo.conversionRate / 100; // 5%
    
    // Calculate current revenue from this keyword
    const currentClicks = (keyword.searchVolume * currentCTR) / 100;
    const currentConversions = currentClicks * conversionRate;
    const currentKeywordRevenue = currentConversions * avgTicket;
    
    // Calculate potential revenue from this keyword at target position
    const potentialClicks = (keyword.searchVolume * targetCTR) / 100;
    const potentialConversions = potentialClicks * conversionRate;
    const potentialKeywordRevenue = potentialConversions * avgTicket;
    
    currentRevenue += currentKeywordRevenue;
    potentialRevenue += potentialKeywordRevenue;
  });
  
  return { current: currentRevenue, potential: potentialRevenue };
}

export function calculateUnifiedRevenue(inputs: RevenueCalculationInputs): RevenueCalculationResult {
  const {
    monthlyRevenue,
    avgTicket,
    monthlyTransactions,
    keywords,
    currentLocalPackPosition,
    currentOrganicPosition,
    socialFollowersInstagram,
    socialFollowersFacebook,
    emailListSize,
    smsListSize
  } = inputs;

  // SEO Calculations
  let seoCurrentRevenue: number;
  let seoPotentialRevenue: number;
  
  if (keywords && keywords.length > 0) {
    // Use individual keyword data for accurate calculations
    const seoCalcs = calculateKeywordSEORevenue(keywords, avgTicket);
    seoCurrentRevenue = seoCalcs.current;
    seoPotentialRevenue = seoCalcs.potential;
  } else {
    // Fallback to old method if no keyword data provided
    // Estimate search volume based on transaction volume (industry standard multiplier)
    const estimatedMonthlySearches = monthlyTransactions * 2.5;
    
    // Calculate current SEO contribution (estimated at 10-15% of revenue for most restaurants)
    seoCurrentRevenue = monthlyRevenue * 0.1;
    
    // Calculate potential SEO revenue using the calculator
    const seoPotentialIncrease = channelROICalculators.calculateSEOROI(
      estimatedMonthlySearches,
      (currentLocalPackPosition && currentLocalPackPosition > 3) ? 5 : (currentLocalPackPosition || 3), // If not in top 3, assume position 5
      1, // Target position
      avgTicket
    );
    
    seoPotentialRevenue = seoCurrentRevenue + seoPotentialIncrease;
  }

  // Social Media Calculations
  const totalSocialFollowers = socialFollowersInstagram + socialFollowersFacebook;
  
  // Current social revenue (estimated at 3% of revenue for most restaurants)
  const socialCurrentRevenue = monthlyRevenue * 0.03;
  
  // More realistic social media potential with proper management
  // Instagram: 1.5% monthly conversion rate (strong visual platform for food)
  // Facebook: 0.5% monthly conversion rate (lower engagement)
  // Factor in better content strategy and posting consistency
  const instagramMonthlyRevenue = socialFollowersInstagram * 0.015 * avgTicket; 
  const facebookMonthlyRevenue = socialFollowersFacebook * 0.005 * avgTicket;
  
  // Add potential from improved content strategy (25% boost)
  const improvedContentBoost = (instagramMonthlyRevenue + facebookMonthlyRevenue) * 0.25;
  const socialPotentialRevenue = socialCurrentRevenue + instagramMonthlyRevenue + facebookMonthlyRevenue + improvedContentBoost;

  // SMS Marketing Calculations
  // Most restaurants have zero SMS marketing
  const smsCurrentRevenue = smsListSize > 0 
    ? channelROICalculators.calculateSMSROI(smsListSize, 4, avgTicket)
    : 0;
  
  // Potential SMS list is 30% of monthly customers opting in
  const potentialSMSListSize = monthlyTransactions * 0.3;
  const smsPotentialRevenue = channelROICalculators.calculateSMSROI(
    potentialSMSListSize,
    4, // 4 campaigns per month
    avgTicket
  );

  return {
    seo: {
      currentRevenue: seoCurrentRevenue,
      potentialRevenue: seoPotentialRevenue,
      additionalRevenue: seoPotentialRevenue - seoCurrentRevenue
    },
    social: {
      currentRevenue: socialCurrentRevenue,
      potentialRevenue: socialPotentialRevenue,
      additionalRevenue: socialPotentialRevenue - socialCurrentRevenue
    },
    sms: {
      currentRevenue: smsCurrentRevenue,
      potentialRevenue: smsPotentialRevenue,
      additionalRevenue: smsPotentialRevenue - smsCurrentRevenue
    },
    totalAdditionalRevenue: 
      (seoPotentialRevenue - seoCurrentRevenue) +
      (socialPotentialRevenue - socialCurrentRevenue) +
      (smsPotentialRevenue - smsCurrentRevenue)
  };
}