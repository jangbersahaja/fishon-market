// Shared booking form types
export interface BookingFormData {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  adults: number;
  children: number;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note?: string;
  // Emergency contact fields
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  // Participants list
  participants: Array<{
    name: string;
    phone: string;
    isBooker?: boolean;
  }>;
}
