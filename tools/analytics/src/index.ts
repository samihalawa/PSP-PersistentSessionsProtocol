/**
 * PSP Analytics - Growth Tracking and Metrics
 * 
 * Tracks key metrics for PSP adoption and growth:
 * - Session creation/usage patterns
 * - API endpoint usage
 * - User engagement metrics
 * - Platform adoption rates
 * - Performance metrics
 */

export interface AnalyticsEvent {
  event: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
}

export interface UsageMetrics {
  totalSessions: number;
  activeSessions: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  apiCallsPerDay: number;
  averageSessionDuration: number;
  topPlatforms: Array<{ platform: string; count: number }>;
  errorRate: number;
}

export interface GrowthMetrics {
  userSignups: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureAdoption: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

export class PSPAnalytics {
  private events: AnalyticsEvent[] = [];
  private redis: any; // Redis client for caching
  private influx: any; // InfluxDB client for time-series data

  constructor() {
    // Initialize connections in real implementation
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(analyticsEvent);
    
    // In real implementation, send to InfluxDB
    console.log(`📊 Tracked event: ${event.event}`);
    
    // Store in time-series database
    await this.storeEvent(analyticsEvent);
  }

  /**
   * Get current usage metrics
   */
  async getUsageMetrics(): Promise<UsageMetrics> {
    // In real implementation, query from database
    const mockMetrics: UsageMetrics = {
      totalSessions: this.calculateTotalSessions(),
      activeSessions: this.calculateActiveSessions(),
      dailyActiveUsers: this.calculateDailyActiveUsers(),
      monthlyActiveUsers: this.calculateMonthlyActiveUsers(),
      apiCallsPerDay: this.calculateApiCalls(),
      averageSessionDuration: this.calculateAverageSessionDuration(),
      topPlatforms: this.getTopPlatforms(),
      errorRate: this.calculateErrorRate()
    };

    return mockMetrics;
  }

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(): Promise<GrowthMetrics> {
    const mockGrowth: GrowthMetrics = {
      userSignups: this.calculateUserSignups(),
      userRetention: {
        day1: 0.75,
        day7: 0.45,
        day30: 0.25
      },
      featureAdoption: this.calculateFeatureAdoption(),
      geographicDistribution: this.calculateGeographicDistribution()
    };

    return mockGrowth;
  }

  /**
   * Generate analytics report
   */
  async generateReport(): Promise<string> {
    const usage = await this.getUsageMetrics();
    const growth = await this.getGrowthMetrics();

    const report = `
# PSP Analytics Report
Generated: ${new Date().toISOString()}

## Usage Metrics
- Total Sessions: ${usage.totalSessions.toLocaleString()}
- Active Sessions: ${usage.activeSessions.toLocaleString()}
- Daily Active Users: ${usage.dailyActiveUsers.toLocaleString()}
- Monthly Active Users: ${usage.monthlyActiveUsers.toLocaleString()}
- API Calls/Day: ${usage.apiCallsPerDay.toLocaleString()}
- Avg Session Duration: ${usage.averageSessionDuration} minutes
- Error Rate: ${(usage.errorRate * 100).toFixed(2)}%

## Top Platforms
${usage.topPlatforms.map(p => `- ${p.platform}: ${p.count}`).join('\n')}

## Growth Metrics
- New User Signups: ${growth.userSignups.toLocaleString()}
- User Retention:
  - Day 1: ${(growth.userRetention.day1 * 100).toFixed(1)}%
  - Day 7: ${(growth.userRetention.day7 * 100).toFixed(1)}%
  - Day 30: ${(growth.userRetention.day30 * 100).toFixed(1)}%

## Feature Adoption
${Object.entries(growth.featureAdoption).map(([feature, count]) => 
  `- ${feature}: ${count} users`).join('\n')}
    `.trim();

    return report;
  }

  /**
   * Track session creation
   */
  async trackSessionCreated(sessionId: string, userId?: string, platform?: string): Promise<void> {
    await this.trackEvent({
      event: 'session_created',
      sessionId,
      userId,
      properties: {
        platform,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Track session usage
   */
  async trackSessionUsed(sessionId: string, userId?: string, action?: string): Promise<void> {
    await this.trackEvent({
      event: 'session_used',
      sessionId,
      userId,
      properties: {
        action,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Track API call
   */
  async trackApiCall(endpoint: string, method: string, status: number, duration: number): Promise<void> {
    await this.trackEvent({
      event: 'api_call',
      properties: {
        endpoint,
        method,
        status,
        duration,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Track error
   */
  async trackError(error: string, context?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event: 'error',
      properties: {
        error,
        ...context,
        timestamp: Date.now()
      }
    });
  }

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    // Store in InfluxDB for time-series analysis
    // Store in Redis for real-time queries
    // Implementation details...
  }

  private calculateTotalSessions(): number {
    return this.events.filter(e => e.event === 'session_created').length;
  }

  private calculateActiveSessions(): number {
    const recentEvents = this.events.filter(e => 
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    return new Set(recentEvents.map(e => e.sessionId).filter(Boolean)).size;
  }

  private calculateDailyActiveUsers(): number {
    const recentEvents = this.events.filter(e => 
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    return new Set(recentEvents.map(e => e.userId).filter(Boolean)).size;
  }

  private calculateMonthlyActiveUsers(): number {
    const recentEvents = this.events.filter(e => 
      e.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    return new Set(recentEvents.map(e => e.userId).filter(Boolean)).size;
  }

  private calculateApiCalls(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.events.filter(e => 
      e.event === 'api_call' && e.timestamp >= today
    ).length;
  }

  private calculateAverageSessionDuration(): number {
    // Mock calculation - in real implementation, track session start/end
    return 15.5; // minutes
  }

  private getTopPlatforms(): Array<{ platform: string; count: number }> {
    const platforms: Record<string, number> = {};
    
    this.events
      .filter(e => e.event === 'session_created' && e.properties.platform)
      .forEach(e => {
        const platform = e.properties.platform;
        platforms[platform] = (platforms[platform] || 0) + 1;
      });

    return Object.entries(platforms)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateErrorRate(): number {
    const totalApiCalls = this.events.filter(e => e.event === 'api_call').length;
    const errors = this.events.filter(e => e.event === 'error').length;
    return totalApiCalls > 0 ? errors / totalApiCalls : 0;
  }

  private calculateUserSignups(): number {
    return this.events.filter(e => e.event === 'user_signup').length;
  }

  private calculateFeatureAdoption(): Record<string, number> {
    const features: Record<string, number> = {};
    
    this.events.forEach(e => {
      if (e.properties.feature) {
        const feature = e.properties.feature;
        features[feature] = (features[feature] || 0) + 1;
      }
    });

    return features;
  }

  private calculateGeographicDistribution(): Record<string, number> {
    // Mock data - in real implementation, get from IP geolocation
    return {
      'United States': 45,
      'Germany': 12,
      'United Kingdom': 8,
      'Canada': 7,
      'France': 6,
      'Japan': 5,
      'Australia': 4,
      'Other': 13
    };
  }
}

// Export singleton instance
export const analytics = new PSPAnalytics();

// Middleware for Express apps
export const analyticsMiddleware = (analytics: PSPAnalytics) => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      analytics.trackApiCall(
        req.path,
        req.method,
        res.statusCode,
        duration
      );
    });
    
    next();
  };
};