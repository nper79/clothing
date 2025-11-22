export interface StyleAnalysis {
  matchesProfile: boolean;
  score: number;
  reasoning: string;
  recommendations: string[];
  styleAlignment: {
    perception: string[];
    complexity: string;
    occasions: string[];
    colors: string[];
  };
}

class StyleAnalysisService {
  private static instance: StyleAnalysisService;
  private userStyleProfile: any = null;

  static getInstance(): StyleAnalysisService {
    if (!StyleAnalysisService.instance) {
      StyleAnalysisService.instance = new StyleAnalysisService();
    }
    return StyleAnalysisService.instance;
  }

  setUserProfile(profile: any) {
    this.userStyleProfile = profile;
  }

  async analyzeOutfitForUser(outfitDescription: string, lookName?: string): Promise<StyleAnalysis> {
    if (!this.userStyleProfile) {
      return this.getDefaultAnalysis();
    }

    try {
      const response = await fetch('/api/style-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: this.userStyleProfile,
          outfitDescription,
          lookName,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const analysis = (await response.json()) as StyleAnalysis;
      return analysis;
    } catch (error) {
      console.error('Failed to analyze outfit with Replicate:', error);
      return this.getDefaultAnalysis();
    }
  }

  private getDefaultAnalysis(): StyleAnalysis {
    return {
      matchesProfile: true,
      score: 75,
      reasoning:
        'This outfit aligns well with your style preferences and helps you move toward your desired aesthetic.',
      recommendations: [
        'Consider adding accessories that reflect your personal style',
        'Make sure the colors match your skin tone and preferences',
      ],
      styleAlignment: {
        perception: ['Confident', 'Modern'],
        complexity: 'Balanced',
        occasions: ['Casual', 'Weekend'],
        colors: ['Versatile neutral base'],
      },
    };
  }

  async generateStyleInsights(profile: any): Promise<string> {
    try {
      const response = await fetch('/api/style-analysis/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as { insights?: string };
      if (typeof payload?.insights === 'string' && payload.insights.trim().length > 0) {
        return payload.insights.trim();
      }
    } catch (error) {
      console.error('Failed to generate style insights:', error);
    }
    return this.getDefaultInsight();
  }

  private getDefaultInsight() {
    return 'Your style journey is about expressing your unique personality through fashion.';
  }
}

export default StyleAnalysisService.getInstance();
