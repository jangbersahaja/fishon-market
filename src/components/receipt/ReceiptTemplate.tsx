/**
 * Booking Confirmation PDF Template
 * Matches the desktop book/confirm page layout
 * Two-column design with photo, captain info, pricing, and PAID stamp
 */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";

/**
 * Translation strings for the receipt
 */
export interface ReceiptTranslations {
  tagline: string;
  bookingConfirmed: string;
  title: string;
  subtitle: string;
  confirmationNumber: string;
  bookingId: string;
  bookedOn: string;
  paidOn: string;
  tripDetails: string;
  charter: string;
  trip: string;
  location: string;
  date: string;
  duration: string;
  startTime: string;
  guests: string;
  day: string;
  days: string;
  adult: string;
  adults: string;
  child: string;
  children: string;
  contactInfo: string;
  name: string;
  email: string;
  phone: string;
  guest: string;
  notProvided: string;
  emergencyContact: string;
  relationship: string;
  pricingSummary: string;
  tripPrice: string;
  included: string;
  totalAmountPaid: string;
  promoApplied: string;
  discount: string;
  importantInfo: string;
  arriveEarly: string;
  bringItems: string;
  contactCaptain: string;
  footerMessage: string;
  footerThanks: string;
  footerContact: string;
  footerNote: string;
  qrCodeLabel: string;
  // New translations for matching desktop view
  captain: string;
  boatDetails: string;
  vessel: string;
  capacity: string;
  boatFeatures: string;
  whatsIncluded: string;
  paymentStatus: string;
  paid: string;
  pending: string;
  tripDate: string;
  meetingPoint: string;
  participants: string;
  booker: string;
  perDay: string;
  serviceFee: string;
  subtotal: string;
  numberOfDays: string;
}

// Types
interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface Participant {
  name: string;
  phone: string;
  isBooker?: boolean;
}

interface DiscountData {
  code: string;
  percentage?: number;
  amount: number;
}

interface BoatData {
  name: string;
  type: string;
  length?: number;
  capacity: number;
  features?: string[];
}

interface CaptainData {
  name: string;
  experience?: number;
  phone?: string;
}

interface ReceiptData {
  booking: {
    id: string;
    charterName: string;
    location: string;
    tripName: string;
    date: Date;
    days: number;
    adults: number;
    children: number;
    startTime: string | null;
    durationHour?: number;
    unitPrice: number;
    subtotal: number;
    totalPrice: number;
    serviceFee?: number;
    platformFee?: number;
    paidAt: Date | null;
    createdAt: Date;
    emergencyContact?: EmergencyContact;
    participants?: Participant[];
    discount?: DiscountData | null;
    // New fields to match desktop view
    charterImage?: string;
    boat?: BoatData;
    captain?: CaptainData;
    meetingPoint?: string;
    amenities?: string[];
  };
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  receiptNumber: string;
}

interface ReceiptTemplateProps {
  data: ReceiptData;
  translations: ReceiptTranslations;
  locale: string;
}

// Date formatting based on locale
function formatDate(iso: string | undefined, locale: string) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const localeCode = locale === "ms" ? "ms-MY" : "en-MY";
    const dateStr = date.toLocaleDateString(localeCode, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });
    const timeStr = date.toLocaleTimeString(localeCode, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kuala_Lumpur",
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string | undefined, locale: string) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const localeCode = locale === "ms" ? "ms-MY" : "en-MY";
    return date.toLocaleDateString(localeCode, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number) {
  return `RM ${amount.toFixed(2)}`;
}

// Brand Colors
const colors = {
  primary: "#ec2227", // Fishon red
  primaryDark: "#c91c21",
  success: "#10B981",
  successLight: "#D1FAE5",
  successDark: "#065F46",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningDark: "#92400E",
  info: "#3B82F6",
  infoLight: "#EFF6FF",
  infoDark: "#1E40AF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",
  white: "#FFFFFF",
};

// Styles - Desktop-Like Two-Column Layout
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: colors.gray100,
  },
  // Compact Header with Logo
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 33,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  confirmationBadge: {
    backgroundColor: colors.success,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  confirmationText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    letterSpacing: 0.3,
  },
  receiptNumber: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
  },
  // Main Two-Column Layout
  mainContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
  },
  // Left Column - Booking Details (wider)
  leftColumn: {
    flex: 2,
    gap: 12,
  },
  // Right Column - Charter Summary (narrower)
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  // Card Base Style
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  // Charter Image Section (Right Column)
  charterImage: {
    width: "100%",
    height: 100,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  charterImagePlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 6,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 10,
    color: colors.gray400,
  },
  // Charter Name & Trip Info
  charterTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    marginTop: 10,
    marginBottom: 4,
  },
  tripBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  tripBadgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
  },
  locationText: {
    fontSize: 9,
    color: colors.gray600,
    marginBottom: 12,
  },
  // Details Grid (like BookingDetails icons grid)
  detailsGrid: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  detailIconText: {
    fontSize: 10,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 8,
    color: colors.gray500,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  detailSubValue: {
    fontSize: 8,
    color: colors.gray600,
    marginTop: 1,
  },
  // Participants List
  participantsList: {
    marginTop: 8,
  },
  participantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  participantName: {
    fontSize: 9,
    color: colors.gray700,
  },
  participantPhone: {
    fontSize: 8,
    color: colors.gray500,
  },
  bookerBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  bookerBadgeText: {
    fontSize: 7,
    color: colors.white,
    fontFamily: "Helvetica-Bold",
  },
  // Emergency Contact (Yellow Box)
  emergencyBox: {
    backgroundColor: colors.warningLight,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  emergencyTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.warningDark,
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 8,
    color: colors.warningDark,
  },
  // Pricing Section with PAID Stamp
  pricingSection: {
    position: "relative",
  },
  pricingRows: {
    gap: 6,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 9,
    color: colors.gray600,
  },
  pricingValue: {
    fontSize: 9,
    color: colors.gray700,
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.successLight,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 4,
  },
  discountLabel: {
    fontSize: 9,
    color: colors.successDark,
    flexDirection: "row",
    alignItems: "center",
  },
  discountCode: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.successDark,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 6,
  },
  discountValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.successDark,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  // PAID Stamp Overlay
  paidStamp: {
    position: "absolute",
    top: 20,
    right: 10,
    backgroundColor: colors.success,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 4,
    transform: "rotate(-12deg)",
    shadowColor: colors.success,
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  paidStampText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    letterSpacing: 2,
  },
  // Captain & Boat Info (Right Column)
  captainSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  captainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  captainAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  captainAvatarText: {
    fontSize: 12,
    color: colors.gray500,
  },
  captainName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  captainLabel: {
    fontSize: 8,
    color: colors.gray500,
  },
  // Boat Info
  boatSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.gray50,
    borderRadius: 6,
  },
  boatName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    marginBottom: 4,
  },
  boatDetail: {
    fontSize: 8,
    color: colors.gray600,
    marginBottom: 2,
  },
  boatFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  featureBadge: {
    backgroundColor: colors.gray200,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  featureBadgeText: {
    fontSize: 7,
    color: colors.gray600,
  },
  // Amenities Section (Right Column)
  amenitiesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  amenitiesTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    marginBottom: 8,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  amenityBadge: {
    backgroundColor: colors.successLight,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  amenityText: {
    fontSize: 7,
    color: colors.successDark,
  },
  // Meeting Point (Right Column)
  meetingSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.infoLight,
    borderRadius: 6,
  },
  meetingTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.infoDark,
    marginBottom: 4,
  },
  meetingText: {
    fontSize: 8,
    color: colors.infoDark,
    lineHeight: 1.4,
  },
  // Important Info Box
  importantBox: {
    backgroundColor: colors.infoLight,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  importantTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.infoDark,
    marginBottom: 8,
  },
  importantItem: {
    fontSize: 8,
    color: colors.infoDark,
    marginBottom: 4,
    paddingLeft: 10,
  },
  // Footer
  footer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.gray50,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  footerText: {
    fontSize: 8,
    color: colors.gray500,
    marginBottom: 2,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerBrand: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  footerTagline: {
    fontSize: 7,
    color: colors.gray400,
  },
  // Reference Info Row
  referenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  referenceLabel: {
    fontSize: 8,
    color: colors.gray500,
  },
  referenceValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.gray700,
  },
});

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({
  data,
  translations: t,
  locale,
}) => {
  const { booking, user, receiptNumber } = data;

  // For PDF rendering, we need absolute URLs
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://fishon.my";
  const logoUrl = `${baseUrl}/images/logos/fishon-logo-white.png`;

  // Helper for pluralization
  const getDurationText = () => {
    const days = booking.days;
    return `${days} ${days === 1 ? t.day : t.days}`;
  };

  const getGuestsText = () => {
    const parts: string[] = [];
    if (booking.adults > 0) {
      parts.push(
        `${booking.adults} ${booking.adults === 1 ? t.adult : t.adults}`
      );
    }
    if (booking.children > 0) {
      parts.push(
        `${booking.children} ${booking.children === 1 ? t.child : t.children}`
      );
    }
    return parts.join(", ");
  };

  const getTotalGuests = () => booking.adults + booking.children;

  // Get captain initials for avatar
  const getCaptainInitials = () => {
    if (!booking.captain?.name) return "?";
    return booking.captain.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Compact Header */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View style={styles.headerRight}>
            {booking.paidAt && (
              <View style={styles.confirmationBadge}>
                <Text style={styles.confirmationText}>
                  {t.bookingConfirmed}
                </Text>
              </View>
            )}
            <Text style={styles.receiptNumber}>#{receiptNumber}</Text>
          </View>
        </View>

        {/* Main Two-Column Layout */}
        <View style={styles.mainContainer}>
          {/* Left Column - Booking Details */}
          <View style={styles.leftColumn}>
            {/* Booking Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t.tripDetails}</Text>
              </View>

              {/* Details Grid - No emojis, clean text labels */}
              <View style={styles.detailsGrid}>
                {/* Trip Date */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Text style={styles.detailIconText}>[ ]</Text>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>
                      {t.tripDate || t.date}
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatDateOnly(booking.date.toISOString(), locale)}
                    </Text>
                  </View>
                </View>

                {/* Start Time */}
                {booking.startTime && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Text style={styles.detailIconText}>( )</Text>
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>{t.startTime}</Text>
                      <Text style={styles.detailValue}>
                        {booking.startTime}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Duration */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Text style={styles.detailIconText}>~</Text>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t.duration}</Text>
                    <Text style={styles.detailValue}>{getDurationText()}</Text>
                  </View>
                </View>

                {/* Guests */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Text style={styles.detailIconText}>+</Text>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t.guests}</Text>
                    <Text style={styles.detailValue}>
                      {getTotalGuests()} {t.guests}
                    </Text>
                    <Text style={styles.detailSubValue}>{getGuestsText()}</Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Text style={styles.detailIconText}>*</Text>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t.location}</Text>
                    <Text style={styles.detailValue}>{booking.location}</Text>
                    {booking.meetingPoint && (
                      <Text style={styles.detailSubValue}>
                        {booking.meetingPoint}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Participants List */}
              {booking.participants && booking.participants.length > 0 && (
                <View style={styles.participantsList}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { marginTop: 12, marginBottom: 8 },
                    ]}
                  >
                    {t.participants || t.guests}
                  </Text>
                  {booking.participants.map((participant, index) => (
                    <View key={index} style={styles.participantItem}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text style={styles.participantName}>
                          {participant.name}
                        </Text>
                        {participant.isBooker && (
                          <View style={styles.bookerBadge}>
                            <Text style={styles.bookerBadgeText}>
                              {t.booker || "BOOKER"}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.participantPhone}>
                        {participant.phone}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Emergency Contact */}
              {booking.emergencyContact && (
                <View style={styles.emergencyBox}>
                  <Text style={styles.emergencyTitle}>
                    ! {t.emergencyContact}
                  </Text>
                  <Text style={styles.emergencyText}>
                    {booking.emergencyContact.name} (
                    {booking.emergencyContact.relationship}) •{" "}
                    {booking.emergencyContact.phone}
                  </Text>
                </View>
              )}
            </View>

            {/* Pricing Card with PAID Stamp */}
            <View style={styles.card}>
              <View style={styles.pricingSection}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t.pricingSummary}</Text>
                </View>

                <View style={styles.pricingRows}>
                  {/* Trip Price per day */}
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>{t.tripPrice}</Text>
                    <Text style={styles.pricingValue}>
                      {formatCurrency(booking.unitPrice)}
                    </Text>
                  </View>

                  {/* Number of days */}
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>{t.duration}</Text>
                    <Text style={styles.pricingValue}>
                      x {booking.days} {booking.days === 1 ? t.day : t.days}
                    </Text>
                  </View>

                  {/* Subtotal */}
                  <View
                    style={[
                      styles.pricingRow,
                      {
                        paddingTop: 4,
                        borderTopWidth: 1,
                        borderTopColor: colors.gray200,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pricingLabel,
                        { fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      Subtotal
                    </Text>
                    <Text style={styles.pricingValue}>
                      {formatCurrency(
                        booking.subtotal || booking.unitPrice * booking.days
                      )}
                    </Text>
                  </View>

                  {/* Guests Included */}
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>
                      {t.guests} ({getGuestsText()})
                    </Text>
                    <Text style={styles.pricingValue}>{t.included}</Text>
                  </View>

                  {/* Discount if applied */}
                  {booking.discount && booking.discount.amount > 0 && (
                    <View style={styles.discountRow}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text style={styles.discountLabel}>{t.discount}</Text>
                        <Text style={styles.discountCode}>
                          {booking.discount.code}
                        </Text>
                      </View>
                      <Text style={styles.discountValue}>
                        -{formatCurrency(booking.discount.amount)}
                      </Text>
                    </View>
                  )}

                  {/* Service Fee (Payment Gateway) */}
                  {booking.serviceFee !== undefined &&
                    booking.serviceFee > 0 && (
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Service Fee</Text>
                        <Text style={styles.pricingValue}>
                          {formatCurrency(booking.serviceFee)}
                        </Text>
                      </View>
                    )}

                  <View style={styles.totalDivider} />

                  {/* Total */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t.totalAmountPaid}</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(booking.totalPrice)}
                    </Text>
                  </View>
                </View>

                {/* PAID Stamp */}
                {booking.paidAt && (
                  <View style={styles.paidStamp}>
                    <Text style={styles.paidStampText}>{t.paid || "PAID"}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Important Info */}
            <View style={styles.importantBox}>
              <Text style={styles.importantTitle}>(i) {t.importantInfo}</Text>
              <Text style={styles.importantItem}>• {t.arriveEarly}</Text>
              <Text style={styles.importantItem}>• {t.bringItems}</Text>
              <Text style={styles.importantItem}>• {t.contactCaptain}</Text>
            </View>
          </View>

          {/* Right Column - Charter Summary */}
          <View style={styles.rightColumn}>
            {/* Charter Info Card */}
            <View style={styles.card}>
              {/* Charter Image or Placeholder */}
              {booking.charterImage ? (
                <Image src={booking.charterImage} style={styles.charterImage} />
              ) : (
                <View style={styles.charterImagePlaceholder}>
                  <Text style={styles.placeholderText}>FISHON</Text>
                </View>
              )}

              {/* Charter Name & Trip */}
              <Text style={styles.charterTitle}>{booking.charterName}</Text>
              <View style={styles.tripBadge}>
                <Text style={styles.tripBadgeText}>{booking.tripName}</Text>
              </View>
              <Text style={styles.locationText}>{booking.location}</Text>

              {/* Captain Info */}
              {booking.captain && (
                <View style={styles.captainSection}>
                  <View style={styles.captainRow}>
                    <View style={styles.captainAvatar}>
                      <Text style={styles.captainAvatarText}>
                        {getCaptainInitials()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.captainName}>
                        {booking.captain.name}
                      </Text>
                      <Text style={styles.captainLabel}>
                        {t.captain || "Captain"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Boat Info */}
              {booking.boat && (
                <View style={styles.boatSection}>
                  <Text style={styles.boatName}>{booking.boat.name}</Text>
                  <Text style={styles.boatDetail}>
                    {booking.boat.type}
                    {booking.boat.length && ` • ${booking.boat.length}ft`}
                  </Text>
                  <Text style={styles.boatDetail}>
                    {t.capacity || "Capacity"}: {booking.boat.capacity}{" "}
                    {t.guests}
                  </Text>
                  {booking.boat.features &&
                    booking.boat.features.length > 0 && (
                      <View style={styles.boatFeatures}>
                        {booking.boat.features.slice(0, 4).map((feature, i) => (
                          <View key={i} style={styles.featureBadge}>
                            <Text style={styles.featureBadgeText}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                </View>
              )}

              {/* Amenities */}
              {booking.amenities && booking.amenities.length > 0 && (
                <View style={styles.amenitiesSection}>
                  <Text style={styles.amenitiesTitle}>
                    {t.whatsIncluded || "What's Included"}
                  </Text>
                  <View style={styles.amenitiesGrid}>
                    {booking.amenities.slice(0, 8).map((amenity, i) => (
                      <View key={i} style={styles.amenityBadge}>
                        <Text style={styles.amenityText}>{amenity}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Reference Info */}
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.gray200,
                }}
              >
                <View style={styles.referenceRow}>
                  <Text style={styles.referenceLabel}>{t.bookingId}</Text>
                  <Text style={styles.referenceValue}>
                    {booking.id.slice(0, 8)}...
                  </Text>
                </View>
                <View style={styles.referenceRow}>
                  <Text style={styles.referenceLabel}>{t.bookedOn}</Text>
                  <Text style={styles.referenceValue}>
                    {formatDate(booking.createdAt.toISOString(), locale)}
                  </Text>
                </View>
                {booking.paidAt && (
                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceLabel}>{t.paidOn}</Text>
                    <Text style={styles.referenceValue}>
                      {formatDate(booking.paidAt.toISOString(), locale)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Booker Contact Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t.contactInfo}</Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                <View>
                  <Text style={styles.detailLabel}>{t.name}</Text>
                  <Text style={styles.detailValue}>{user.name || t.guest}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>{t.email}</Text>
                  <Text style={styles.detailValue}>{user.email}</Text>
                </View>
                {user.phone && (
                  <View>
                    <Text style={styles.detailLabel}>{t.phone}</Text>
                    <Text style={styles.detailValue}>{user.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>{t.footerMessage}</Text>
              <Text style={styles.footerText}>{t.footerContact}</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerBrand}>fishon.my</Text>
              <Text style={styles.footerTagline}>{t.tagline}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptTemplate;
