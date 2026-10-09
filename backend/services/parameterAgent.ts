import { PricingContext, VehicleType } from '../types';
import { getVehicleSpecs } from './rideMatchingService';

export enum SocialTemplate {
    NEWS = 'News_Template',
    TECH = 'Tech_Template'
}

/**
 * The Parameter Agent analyzes real-time supply/demand data and generates
 * strategic insights and "Technical Posts" for the ALONG platform.
 */
export class ParameterAgent {
    /**
     * Analyzes the current pricing context and generates a strategic decision.
     */
    public generateInsights(context: PricingContext) {
        const insights: any[] = [];

        // Trend Detection (TC 25)
        if (context.demandHeatmap) {
            for (const [route, value] of Object.entries(context.demandHeatmap)) {
                if (value > 50) {
                    insights.push({
                        type: 'TREND',
                        region: route,
                        score: value,
                        message: `Demand surge on ${route}. Pivoting strategy.`
                    });
                }
            }
        }

        // Demand Surge Logic
        if (context.activeRequests > context.expectedBaseline * 1.5) {
            insights.push({
                type: 'STRATEGY',
                message: 'High demand surge detected. Priority: Increase driver incentives for Premium XUV pulls.',
                action: 'SEND_PUSH_NOTIFICATION_XUV_DRIVERS'
            });
        }

        // Heatmap Logic (e.g., IIITD to CyberHub)
        if (context.demandHeatmap) {
            for (const [route, value] of Object.entries(context.demandHeatmap)) {
                if (value > 50) { // Threshold for "Hot Route"
                    insights.push({
                        type: 'MARKETING_POST',
                        topic: 'Route Optimization',
                        message: `Hey, there's a surge in people wanting to go from ${route.split('-')[0]} to ${route.split('-')[1]}. 
                     Let's trigger a post about our XUV Premium service being the most cost-effective way for a group of 6 to travel.`,
                        meta: { route, surgeValue: value }
                    });
                }
            }
        }

        return insights;
    }

    /**
     * Generates technical posts explaining the "Tetris" of carpooling.
     */
    public generateTechnicalPost(vehicleType: VehicleType): string {
        const specs = getVehicleSpecs(vehicleType);

        const posts = {
            [VehicleType.XUV]: `
Title: The "Tetris" of Carpooling 🧩
Caption: "Matching people is easy. Matching 3 people with 2 suitcases into a Premium XUV that already has 2 people and a guitar? That’s hard.
Our 'Along' algorithm calculates Volumetric Spatial Constraints in real-time. We don't just find you a ride; we find you a ride that actually has room for your bags.
Our 'Spine' logic for XUVs allows a 2km wiggle room, ensuring we maximize capacity without sacrificing efficiency. 
#Engineering #Optimization #Startup #IIITD"`,
            [VehicleType.SEDAN]: `
Title: Comfort Meets Optimization 🚗
Caption: "Why settle for a solo ride when you can share the comfort of a Sedan? 
Our DSMP-X engine ensures Pareto-Optimal pricing, so you save 30% while the driver earns a bonus. 
#SmartTravel #ALONG #Algorithms"`,
            [VehicleType.AUTO]: `
Title: Quick City Hops 🛺
Caption: "The Auto is the heartbeat of the city. Our 'Quick Hop' strategy prioritizes short, high-frequency segments for maximum turnover. 
#UrbanMobility #Efficiency"`,
            [VehicleType.MINI]: `
Title: Budget Economy Travel 🚙
Caption: "Travel smarter, not harder. Our Mini fleet uses core corridor pruning to keep you moving on the most direct paths at the best prices. 
#BudgetTravel #Pool"`,
        };

        return posts[vehicleType] || posts[VehicleType.SEDAN];
    }

    /**
     * Selects the correct template based on content type (TC 27).
     */
    public selectTemplate(type: 'NEWS' | 'TECH'): SocialTemplate {
        return type === 'NEWS' ? SocialTemplate.NEWS : SocialTemplate.TECH;
    }

    /**
     * Returns a referral link or waitlist trigger (TC 30-34).
     */
    public getMonetizationCTA(): string {
        return "\nJoin the waitlist for early access: along.io/waitlist?ref=ai_bot";
    }

    /**
     * Verifies brand voice (TC 28).
     */
    public getBrandVoiceHeader(): string {
        return "🚀 ALONG Dev Log: ";
    }

    /**
     * Explains the Graph Theory behind the "Spine" routing.
     */
    public explainSpineRouting(): string {
        return `
### Technical Insight: The "Recursive Polyline" Spine
In a 6-seater XUV, the 'Polyline' (the route on the map) becomes more like a 'Spine.'
1. **The Core**: The AI calculates a straight 'Spine' from the Driver's Start to End.
2. **Node Discovery**: It looks for 'Nodes' (Riders) within a 2km radius of that spine.
3. **Weight Calibration**: Because the total fare from 6 people covers extra fuel, the AI can afford to 'wiggle' the line more than a standard Sedan corridor.
This is essentially solving a dynamic version of the **Knapsack Problem** combined with **Spatial Buffer Queries**.`;
    }
}
