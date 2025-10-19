export interface Subscription {
  planId: string;
  planName: string;
  billingInterval: 'monthly' | 'annual';
  seatsPurchased: number;
  seatsInUse: number;
  renewsOn: string;
}
