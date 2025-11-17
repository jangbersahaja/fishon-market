/**
 * Booking Confirmation PDF Template
 * Modern, clean design focused on trip details and customer information
 * Uses Fishon brand colors and logo
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

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });
  } catch {
    return iso;
  }
}

// Types
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
    unitPrice: number;
    totalPrice: number;
    paidAt: Date | null;
    createdAt: Date;
  };
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  receiptNumber: string;
}

// Styles - Modern Booking Confirmation Design
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#F8FAFC",
  },
  // Hero Header with Fishon Brand
  hero: {
    backgroundColor: "#ec2227",
    padding: 40,
    paddingBottom: 60,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 150,
    height: 50,
    marginRight: 12,
  },
  brandName: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 11,
    color: "#FFE5E6",
    marginTop: 4,
  },
  confirmationBadge: {
    marginTop: 20,
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  confirmationText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  // Main Content Container
  contentContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 40,
    marginTop: -40,
    borderRadius: 8,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  confirmationTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 24,
  },
  // Trip Highlight Card
  tripCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    padding: 20,
    marginBottom: 24,
    borderLeft: "4pt solid #ec2227",
  },
  charterName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#ec2227",
    marginBottom: 6,
  },
  tripName: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 12,
  },
  tripDetails: {
    flexDirection: "row",
    gap: 16,
  },
  tripDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
  },
  // Info Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2pt solid #E2E8F0",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 24,
  },
  infoColumn: {
    flex: 1,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    color: "#334155",
  },
  // Pricing Card
  pricingCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 20,
    marginTop: 24,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  pricingLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  pricingValue: {
    fontSize: 10,
    color: "#334155",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 8,
    borderTop: "2pt solid #CBD5E1",
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ec2227",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#ec2227",
  },
  // Footer
  footer: {
    marginHorizontal: 40,
    marginTop: 30,
    marginBottom: 40,
    paddingTop: 20,
    borderTop: "1pt solid #CBD5E1",
  },
  footerText: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  footerNote: {
    fontSize: 8,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
  },
  // Reference Numbers Box
  referenceBox: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  referenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  referenceLabel: {
    fontSize: 9,
    color: "#64748B",
  },
  referenceValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
});

const ReceiptTemplate: React.FC<{ data: ReceiptData }> = ({ data }) => {
  const { booking, user, receiptNumber } = data;

  // For PDF rendering, we need absolute URLs
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://fishon.my";
  const logoUrl = `${baseUrl}/images/logos/fishon-logo-white.png`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hero Header */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image src={logoUrl} style={styles.logo} />
          </View>
          <Text style={styles.tagline}>
            Malaysia&apos;s Premier Fishing Charter Marketplace
          </Text>
          {booking.paidAt && (
            <View style={styles.confirmationBadge}>
              <Text style={styles.confirmationText}>✓ BOOKING CONFIRMED</Text>
            </View>
          )}
        </View>

        {/* Main Content Card */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.confirmationTitle}>Booking Confirmation</Text>
          <Text style={styles.confirmationSubtitle}>
            Your fishing adventure awaits! Here are your booking details.
          </Text>

          {/* Reference Numbers */}
          <View style={styles.referenceBox}>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Confirmation Number</Text>
              <Text style={styles.referenceValue}>{receiptNumber}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Booking ID</Text>
              <Text style={styles.referenceValue}>{booking.id}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Booked On</Text>
              <Text style={styles.referenceValue}>
                {formatDate(booking.createdAt.toISOString())}
              </Text>
            </View>
            {booking.paidAt && (
              <View style={styles.referenceRow}>
                <Text style={styles.referenceLabel}>Paid On</Text>
                <Text style={styles.referenceValue}>
                  {formatDate(booking.paidAt.toISOString())}
                </Text>
              </View>
            )}
          </View>

          {/* Trip Highlight Card */}
          <View style={styles.tripCard}>
            <Text style={styles.charterName}>{booking.charterName}</Text>
            <Text style={styles.tripName}>
              {booking.tripName} • {booking.location}
            </Text>
            <View style={styles.tripDetails}>
              <View style={styles.tripDetailItem}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(booking.date.toISOString())}
                </Text>
              </View>
              <View style={styles.tripDetailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {booking.days} {booking.days === 1 ? "day" : "days"}
                </Text>
              </View>
              {booking.startTime && (
                <View style={styles.tripDetailItem}>
                  <Text style={styles.detailLabel}>Start Time</Text>
                  <Text style={styles.detailValue}>{booking.startTime}</Text>
                </View>
              )}
              <View style={styles.tripDetailItem}>
                <Text style={styles.detailLabel}>Guests</Text>
                <Text style={styles.detailValue}>
                  {booking.adults} Adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children > 0 &&
                    `, ${booking.children} Child${booking.children !== 1 ? "ren" : ""}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.value}>{user.name || "Guest"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{user.phone || "—"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pricing Summary */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>
                Trip Price ({booking.days} {booking.days === 1 ? "day" : "days"}{" "}
                × RM {booking.unitPrice.toFixed(2)})
              </Text>
              <Text style={styles.pricingValue}>
                RM {(booking.unitPrice * booking.days).toFixed(2)}
              </Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>
                Guests ({booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                {booking.children > 0 &&
                  `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                )
              </Text>
              <Text style={styles.pricingValue}>Included</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount Paid</Text>
              <Text style={styles.totalValue}>
                RM {booking.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎣 Get ready for an unforgettable fishing adventure!
          </Text>
          <Text style={styles.footerText}>
            Thank you for choosing Fishon.my - Malaysia&apos;s Premier Fishing
            Charter Marketplace
          </Text>
          <Text style={styles.footerText}>
            Questions? Contact us at support@fishon.my or visit fishon.my/help
          </Text>
          <Text style={styles.footerNote}>
            This is an automated booking confirmation. Please bring this
            document or your confirmation number on the day of your trip.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptTemplate;
