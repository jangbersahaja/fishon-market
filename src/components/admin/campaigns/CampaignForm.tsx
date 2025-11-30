"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignFormData } from "@/lib/admin/campaign-actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImageUploadField } from "./ImageUploadField";

interface CampaignFormProps {
  initialData?: Partial<CampaignFormData>;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  submitLabel?: string;
}

const campaignTypes = [
  { value: "REGISTRATION_INCENTIVE", label: "Registration Incentive" },
  { value: "SEASONAL_PROMOTION", label: "Seasonal Promotion" },
  { value: "PARTNER_OFFER", label: "Partner Offer" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
] as const;

const campaignStatuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const dismissalStrategies = [
  { value: "SESSION_ONLY", label: "Session Only" },
  { value: "SESSION_WITH_COOLDOWN", label: "Session with Cooldown" },
  { value: "PERMANENT", label: "Permanent" },
  { value: "MAX_DISMISSALS", label: "Max Dismissals" },
] as const;

const placementPositions = [
  { value: "RIGHT_SIDEBAR", label: "Right Sidebar" },
  { value: "LEFT_SIDEBAR", label: "Left Sidebar" },
  { value: "BOTTOM_FIXED", label: "Bottom Fixed" },
  { value: "TOP_BANNER", label: "Top Banner" },
  { value: "MODAL_CENTER", label: "Modal Center" },
  { value: "INLINE_CONTENT", label: "Inline Content" },
] as const;

const deviceOptions = ["DESKTOP", "MOBILE", "TABLET"];
const pageOptions = ["home", "search", "charter-detail", "book", "account"];
const userRoles = ["CAPTAIN", "STAFF", "ADMIN"];

export function CampaignForm({
  initialData,
  onSubmit,
  submitLabel = "Create Campaign",
}: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    code: initialData?.code || "",
    type: initialData?.type || "REGISTRATION_INCENTIVE",
    status: initialData?.status || "DRAFT",
    priority: initialData?.priority || 50,
    startDate: initialData?.startDate || null,
    endDate: initialData?.endDate || null,
    targetGuests: initialData?.targetGuests ?? true,
    targetRegistered: initialData?.targetRegistered ?? false,
    excludeRoles: initialData?.excludeRoles || [],
    allowedPages: initialData?.allowedPages || ["search", "home"],
    allowedDevices: initialData?.allowedDevices || ["DESKTOP", "MOBILE"],
    contentEn: initialData?.contentEn || {
      title: "",
      subtitle: "",
      cta: "",
      benefits: [],
    },
    contentMy: initialData?.contentMy || {
      title: "",
      subtitle: "",
      cta: "",
      benefits: [],
    },
    dismissalStrategy: initialData?.dismissalStrategy || "SESSION_ONLY",
    cooldownDays: initialData?.cooldownDays || null,
    maxDismissals: initialData?.maxDismissals || null,
    placements: initialData?.placements || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBenefit = (locale: "en" | "ms") => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits: [...(formData[key].benefits || []), ""],
      },
    });
  };

  const updateBenefit = (locale: "en" | "ms", index: number, value: string) => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    const benefits = [...(formData[key].benefits || [])];
    benefits[index] = value;
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits,
      },
    });
  };

  const removeBenefit = (locale: "en" | "ms", index: number) => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    const benefits =
      formData[key].benefits?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits,
      },
    });
  };

  const toggleDevice = (device: string) => {
    const current = formData.allowedDevices;
    const updated = current.includes(device)
      ? current.filter((d) => d !== device)
      : [...current, device];
    setFormData({ ...formData, allowedDevices: updated });
  };

  const togglePage = (page: string) => {
    const current = formData.allowedPages;
    const updated = current.includes(page)
      ? current.filter((p) => p !== page)
      : [...current, page];
    setFormData({ ...formData, allowedPages: updated });
  };

  const toggleRole = (role: string) => {
    const current = formData.excludeRoles;
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setFormData({ ...formData, excludeRoles: updated });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="code">Campaign Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="e.g., welcome-2025"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Unique identifier (lowercase, hyphens only)
            </p>
          </div>

          <div>
            <Label htmlFor="type">Campaign Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              min={0}
              max={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Higher = more important (0-100)
            </p>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Scheduling</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.startDate
                    ? format(formData.startDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startDate || undefined}
                  onSelect={(date) =>
                    setFormData({ ...formData, startDate: date || null })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.endDate
                    ? format(formData.endDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.endDate || undefined}
                  onSelect={(date) =>
                    setFormData({ ...formData, endDate: date || null })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Targeting Rules</h2>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 text-base">User Types</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetGuests"
                  checked={formData.targetGuests}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, targetGuests: !!checked })
                  }
                />
                <Label htmlFor="targetGuests" className="font-normal">
                  Target Guests (not logged in)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetRegistered"
                  checked={formData.targetRegistered}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, targetRegistered: !!checked })
                  }
                />
                <Label htmlFor="targetRegistered" className="font-normal">
                  Target Registered Users
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 text-base">Exclude User Roles</Label>
            <div className="flex flex-wrap gap-2">
              {userRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.excludeRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="font-normal">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 text-base">Allowed Pages *</Label>
            <div className="flex flex-wrap gap-2">
              {pageOptions.map((page) => (
                <div key={page} className="flex items-center space-x-2">
                  <Checkbox
                    id={`page-${page}`}
                    checked={formData.allowedPages.includes(page)}
                    onCheckedChange={() => togglePage(page)}
                  />
                  <Label htmlFor={`page-${page}`} className="font-normal">
                    {page}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 text-base">Allowed Devices *</Label>
            <div className="flex flex-wrap gap-2">
              {deviceOptions.map((device) => (
                <div key={device} className="flex items-center space-x-2">
                  <Checkbox
                    id={`device-${device}`}
                    checked={formData.allowedDevices.includes(device)}
                    onCheckedChange={() => toggleDevice(device)}
                  />
                  <Label htmlFor={`device-${device}`} className="font-normal">
                    {device}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content - English */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Content (English) *</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contentEn-title">Title</Label>
            <Input
              id="contentEn-title"
              value={formData.contentEn.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, title: e.target.value },
                })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="contentEn-subtitle">Subtitle</Label>
            <Textarea
              id="contentEn-subtitle"
              value={formData.contentEn.subtitle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: {
                    ...formData.contentEn,
                    subtitle: e.target.value,
                  },
                })
              }
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="contentEn-cta">Call-to-Action</Label>
            <Input
              id="contentEn-cta"
              value={formData.contentEn.cta}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, cta: e.target.value },
                })
              }
              placeholder="e.g., Get Started"
              required
            />
          </div>

          <div className="space-y-1">
            <ImageUploadField
              label="Campaign Image (Optional)"
              value={formData.contentEn.imageUrl}
              onChange={(url) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, imageUrl: url },
                })
              }
              campaignCode={formData.code}
              id="contentEn-imageUrl"
              helpText="Upload an image or paste a URL. Maximum 5MB."
            />
            {formData.contentMy.imageUrl &&
              formData.contentMy.imageUrl !== formData.contentEn.imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:underline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      contentEn: {
                        ...formData.contentEn,
                        imageUrl: formData.contentMy.imageUrl,
                      },
                    })
                  }
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Use same image as Malay version
                </Button>
              )}
          </div>

          <div>
            <Label className="mb-2">Benefits (Optional)</Label>
            {formData.contentEn.benefits?.map((benefit, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit("en", index, e.target.value)}
                  placeholder="Benefit point"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeBenefit("en", index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBenefit("en")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Benefit
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Malay */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Content (Malay) *</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contentMy-title">Tajuk</Label>
            <Input
              id="contentMy-title"
              value={formData.contentMy.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, title: e.target.value },
                })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="contentMy-subtitle">Subtajuk</Label>
            <Textarea
              id="contentMy-subtitle"
              value={formData.contentMy.subtitle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: {
                    ...formData.contentMy,
                    subtitle: e.target.value,
                  },
                })
              }
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="contentMy-cta">Seruan Bertindak</Label>
            <Input
              id="contentMy-cta"
              value={formData.contentMy.cta}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, cta: e.target.value },
                })
              }
              placeholder="e.g., Mula Sekarang"
              required
            />
          </div>

          <div className="space-y-1">
            <ImageUploadField
              label="Imej Kempen (Pilihan)"
              value={formData.contentMy.imageUrl}
              onChange={(url) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, imageUrl: url },
                })
              }
              campaignCode={formData.code}
              id="contentMy-imageUrl"
              helpText="Muat naik imej atau tampal URL. Maksimum 5MB."
            />
            {formData.contentEn.imageUrl &&
              formData.contentEn.imageUrl !== formData.contentMy.imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:underline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      contentMy: {
                        ...formData.contentMy,
                        imageUrl: formData.contentEn.imageUrl,
                      },
                    })
                  }
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Guna imej yang sama seperti versi Inggeris
                </Button>
              )}
          </div>

          <div>
            <Label className="mb-2">Manfaat (Pilihan)</Label>
            {formData.contentMy.benefits?.map((benefit, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit("ms", index, e.target.value)}
                  placeholder="Poin manfaat"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeBenefit("ms", index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBenefit("ms")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Manfaat
            </Button>
          </div>
        </div>
      </div>

      {/* Dismissal Strategy */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Dismissal Strategy</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="dismissalStrategy">Strategy *</Label>
            <Select
              value={formData.dismissalStrategy}
              onValueChange={(value: any) =>
                setFormData({ ...formData, dismissalStrategy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dismissalStrategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.dismissalStrategy === "SESSION_WITH_COOLDOWN" && (
            <div>
              <Label htmlFor="cooldownDays">Cooldown Days</Label>
              <Input
                id="cooldownDays"
                type="number"
                value={formData.cooldownDays || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cooldownDays: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                min={1}
                placeholder="e.g., 3"
              />
            </div>
          )}

          {formData.dismissalStrategy === "MAX_DISMISSALS" && (
            <div>
              <Label htmlFor="maxDismissals">Max Dismissals</Label>
              <Input
                id="maxDismissals"
                type="number"
                value={formData.maxDismissals || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDismissals: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                min={1}
                placeholder="e.g., 5"
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
