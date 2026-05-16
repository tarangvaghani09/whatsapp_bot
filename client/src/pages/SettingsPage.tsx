import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2, Clock, Phone, Mail, MapPin, Globe, DollarSign, FileText, Bot, RotateCcw, Sparkles, Info } from "lucide-react";
import { useBusinessId } from "@/context/BusinessContext";

const BUSINESS_TYPES = [
  { value: "general", label: "General Business" },
  { value: "salon", label: "Hair Salon / Beauty" },
  { value: "clinic", label: "Medical Clinic" },
  { value: "gym", label: "Gym / Fitness Center" },
  { value: "restaurant", label: "Restaurant / Café" },
  { value: "coaching", label: "Coaching / Tuition" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
];

const DEFAULT_PROMPT_PLACEHOLDER = `You are a helpful WhatsApp assistant for {businessName}.
Answer only questions related to our business — services, bookings, hours, location, pricing.
Keep replies short and friendly (under 100 words).
If you don't know something, politely suggest the customer contact us directly.
Do not answer questions unrelated to our business.`;

function stripLegacyAiMarkers(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim().toLowerCase();
      return t !== "#ai:on" && t !== "#ai:off";
    })
    .join("\n")
    .trim();
}

type Form = {
  businessName: string;
  businessType: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  openingHours: string;
  description: string;
  noMatchMessage: string;
  aiFallbackEnabled: boolean;
  welcomeMenuMessage: string;
  welcomeMenuOptions: string;
  greetingKeywords: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  reminderMessageTemplate: string;
  paymentMethods: string;
  staffContactMessage: string;
  currency: string;
  customAiPrompt: string;
};

const EMPTY: Form = {
  businessName: "",
  businessType: "general",
  phone: "",
  email: "",
  address: "",
  website: "",
  openingHours: "",
  description: "",
  noMatchMessage: "",
  aiFallbackEnabled: true,
  welcomeMenuMessage: "",
  welcomeMenuOptions: "",
  greetingKeywords: "",
  reminderEnabled: false,
  reminderMinutesBefore: 60,
  reminderMessageTemplate: "",
  paymentMethods: "",
  staffContactMessage: "",
  currency: "USD",
  customAiPrompt: "",
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const businessId = useBusinessId();
  const { data: settings, isLoading } = useGetSettings({ businessId });
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.businessName ?? "",
        businessType: settings.businessType ?? "general",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        website: settings.website ?? "",
        openingHours: settings.openingHours ?? "",
        description: settings.description ?? "",
        noMatchMessage: settings.noMatchMessage ?? "",
        aiFallbackEnabled: settings.aiFallbackEnabled ?? true,
        welcomeMenuMessage: settings.welcomeMenuMessage ?? "",
        welcomeMenuOptions: settings.welcomeMenuOptions ?? "",
        greetingKeywords: settings.greetingKeywords ?? "",
        reminderEnabled: settings.reminderEnabled ?? false,
        reminderMinutesBefore: settings.reminderMinutesBefore ?? 60,
        reminderMessageTemplate: settings.reminderMessageTemplate ?? "",
        paymentMethods: settings.paymentMethods ?? "",
        staffContactMessage: settings.staffContactMessage ?? "",
        currency: settings.currency ?? "USD",
        customAiPrompt: stripLegacyAiMarkers(settings.customAiPrompt),
      });
      setDirty(false);
    }
  }, [settings]);

  function set<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    await updateSettings.mutateAsync(
      {
        data: {
          businessName: form.businessName || undefined,
          businessType: form.businessType || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          website: form.website || undefined,
          openingHours: form.openingHours || undefined,
          description: form.description || undefined,
          noMatchMessage: form.noMatchMessage || undefined,
          aiFallbackEnabled: form.aiFallbackEnabled,
          welcomeMenuMessage: form.welcomeMenuMessage || undefined,
          welcomeMenuOptions: form.welcomeMenuOptions || undefined,
          greetingKeywords: form.greetingKeywords || undefined,
          reminderEnabled: form.reminderEnabled,
          reminderMinutesBefore: form.reminderMinutesBefore,
          reminderMessageTemplate: form.reminderMessageTemplate || undefined,
          paymentMethods: form.paymentMethods || undefined,
          staffContactMessage: form.staffContactMessage || undefined,
          currency: form.currency || undefined,
          customAiPrompt: stripLegacyAiMarkers(form.customAiPrompt) || undefined,
        },
        params: { businessId },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSettingsQueryKey({ businessId }) });
          setDirty(false);
          toast({ title: "Settings saved", description: "Your business settings have been updated." });
        },
        onError: () => {
          toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 rounded-md bg-gray-200" />
            <div className="h-4 w-80 rounded-md bg-gray-100" />
          </div>
          <div className="h-11 w-full sm:w-36 rounded-xl bg-gray-200" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded-md bg-gray-200" />
                  <div className="h-3 w-56 rounded-md bg-gray-100" />
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded-md bg-gray-200" />
                <div className="h-10 w-full rounded-lg bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded-md bg-gray-200" />
                  <div className="h-10 w-full rounded-lg bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded-md bg-gray-200" />
                  <div className="h-10 w-full rounded-lg bg-gray-100" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Used by the bot to personalise replies and answer customer questions</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || updateSettings.isPending}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-green-200 hover:from-green-600 hover:to-green-700 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {updateSettings.isPending ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
          ) : (
            <><Save className="w-4 h-4" />Save Changes</>
          )}
        </button>
      </div>

      {/* Business Identity */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Business Identity</p>
            <p className="text-xs text-gray-500">Basic info shown in bot responses</p>
          </div>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. Glamour Studio" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={form.businessType} onValueChange={(v) => set("businessType", v)}>
                <SelectTrigger id="businessType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger id="currency"><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Match Message */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center shadow-sm">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">No Match Message</p>
            <p className="text-xs text-gray-500">Used when FAQ/Service/Booking do not match and AI fallback is disabled/unavailable</p>
          </div>
        </div>
        <CardContent className="pt-5">
          <Textarea
            id="noMatchMessage"
            value={form.noMatchMessage}
            onChange={(e) => set("noMatchMessage", e.target.value)}
            placeholder="I couldn't find an exact match. Please contact us and we'll help you right away."
            rows={3}
            className="resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">Leave empty to use default system fallback message.</p>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Contact Details</p>
            <p className="text-xs text-gray-500">How customers can reach you</p>
          </div>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /> Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1-555-0101" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" /> Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@yourbusiness.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" /> Address</Label>
            <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="45 Main Street, City Center" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website" className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-gray-400" /> Website</Label>
            <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://yourbusiness.com" />
          </div>
        </CardContent>
      </Card>

      {/* Opening Hours */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Opening Hours</p>
            <p className="text-xs text-gray-500">The bot will quote this when customers ask about hours</p>
          </div>
        </div>
        <CardContent className="pt-5">
          <Textarea
            id="openingHours"
            value={form.openingHours}
            onChange={(e) => set("openingHours", e.target.value)}
            placeholder={"Mon–Fri: 9:00 AM – 8:00 PM\nSat: 10:00 AM - 6:00 PM\nSunday: Closed\nPublic Holidays: Closed"}
            rows={4}
            className="resize-none font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Business Description */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Business Description</p>
            <p className="text-xs text-gray-500">Extra context fed to AI — helps it give more accurate, on-brand answers</p>
          </div>
        </div>
        <CardContent className="pt-5">
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="e.g. We are a premium hair salon specialising in colour treatments and keratin smoothing. We do not offer nail services. Our stylists speak English and Arabic."
            rows={4}
            className="resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Only used when OpenAI is called as a fallback — does not add to FAQ/service matching cost.
          </p>
        </CardContent>
      </Card>

      {/* Welcome Menu Message */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Welcome Menu Message</p>
            <p className="text-xs text-gray-500">Business-wise greeting shown on hi/hello</p>
          </div>
        </div>
        <CardContent className="pt-5">
          <Textarea
            id="welcomeMenuMessage"
            value={form.welcomeMenuMessage}
            onChange={(e) => set("welcomeMenuMessage", e.target.value)}
            placeholder={"👋 Hello! Welcome to *{businessName}*.\nWe're happy to help you! You can ask us about:\n• Opening hours\n• Location & directions\n• Services & pricing\n• Booking an appointment\n• Payment methods\n\nWe're open: {openingHours}\nAddress: {address}"}
            rows={7}
            className="resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">Supports placeholders: {"{businessName}"}, {"{openingHours}"}, {"{address}"}. Leave empty to use default generated welcome.</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="welcomeMenuOptions">Welcome Menu Options</Label>
              <Textarea
                id="welcomeMenuOptions"
                value={form.welcomeMenuOptions}
                onChange={(e) => set("welcomeMenuOptions", e.target.value)}
                placeholder={"Services & Price|services\nBook Appointment|booking\nSalon Timing|hours\nLocation|location\nTalk to Staff|staff"}
                rows={5}
                className="mt-1 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">One option per line. Optional action after <code>|</code>: <code>services</code>, <code>booking</code>, <code>hours</code>, <code>location</code>, <code>payment</code>, <code>staff</code>.</p>
            </div>
            <div>
              <Label htmlFor="greetingKeywords">Greeting Keywords (Business-wise)</Label>
              <Textarea
                id="greetingKeywords"
                value={form.greetingKeywords}
                onChange={(e) => set("greetingKeywords", e.target.value)}
                placeholder={"hi\nhii\nhello\nhelo\nhey"}
                rows={4}
                className="mt-1 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">One keyword per line (or comma separated). If customer sends one of these, bot sends this business welcome menu message.</p>
            </div>
            <div>
              <Label htmlFor="paymentMethods">Payment Methods Reply</Label>
              <Textarea
                id="paymentMethods"
                value={form.paymentMethods}
                onChange={(e) => set("paymentMethods", e.target.value)}
                placeholder="We accept cash, card, UPI, and online transfer."
                rows={3}
                className="mt-1 resize-none text-sm"
              />
            </div>
            <div>
              <Label htmlFor="staffContactMessage">Talk to Staff Reply</Label>
              <Textarea
                id="staffContactMessage"
                value={form.staffContactMessage}
                onChange={(e) => set("staffContactMessage", e.target.value)}
                placeholder="Please contact our front desk at +1-555-0101 and we'll help you right away."
                rows={3}
                className="mt-1 resize-none text-sm"
              />
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Appointment Reminder</p>
                  <p className="text-xs text-emerald-700">Send automatic WhatsApp reminder before approved booking time</p>
                </div>
                <Switch
                  checked={form.reminderEnabled}
                  onCheckedChange={(v) => set("reminderEnabled", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reminderMinutesBefore">Minutes Before Appointment</Label>
                <Input
                  id="reminderMinutesBefore"
                  type="number"
                  min={5}
                  max={1440}
                  value={form.reminderMinutesBefore}
                  onChange={(e) => set("reminderMinutesBefore", Math.max(5, Math.min(1440, Number(e.target.value || 60))))}
                  disabled={!form.reminderEnabled}
                />
                <p className="text-xs text-emerald-700">Example: 60 means reminder will be sent 1 hour before appointment.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reminderMessageTemplate">Reminder Message Template</Label>
                <Textarea
                  id="reminderMessageTemplate"
                  value={form.reminderMessageTemplate}
                  onChange={(e) => set("reminderMessageTemplate", e.target.value)}
                  disabled={!form.reminderEnabled}
                  rows={3}
                  className="resize-none text-sm"
                  placeholder="Reminder: your appointment is on {date} at {time} for {service}. Reply if you need to reschedule."
                />
                <p className="text-xs text-emerald-700">Optional. Placeholders: {"{date}"}, {"{time}"}, {"{service}"}, {"{businessName}"}. Leave empty to use default reminder message.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom AI System Prompt */}
      <Card className="overflow-hidden border-2 border-dashed border-indigo-200">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Custom AI System Prompt</p>
              <p className="text-xs text-gray-500">Override the default AI instructions — full control over what the bot says</p>
            </div>
          </div>
          {form.customAiPrompt && (
            <button
              onClick={() => set("customAiPrompt", "")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-white border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          )}
        </div>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">AI Fallback</p>
                <p className="text-xs text-indigo-700">{form.aiFallbackEnabled ? "Enabled: AI can answer when FAQ/Service/Booking do not match" : "Disabled: Bot will return safe no-match response"}</p>
              </div>
            </div>
            <Switch
              checked={form.aiFallbackEnabled}
              onCheckedChange={(v) => {
                set("aiFallbackEnabled", v);
              }}
            />
          </div>
          <Textarea
            id="customAiPrompt"
            value={form.customAiPrompt}
            onChange={(e) => set("customAiPrompt", e.target.value)}
            placeholder={DEFAULT_PROMPT_PLACEHOLDER}
            rows={8}
            className="resize-none text-sm font-mono leading-relaxed"
          />
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-indigo-700">How this works</p>
            <ul className="text-xs text-indigo-600 space-y-1 list-disc list-inside">
              <li>Leave blank to use the auto-generated prompt built from your business info above</li>
              <li>When filled, this prompt is sent to the AI exactly as written — you have full control</li>
              <li>Useful if you want to switch AI providers (ChatGPT, Claude, Gemini, etc.) — write the prompt in whatever style that AI prefers</li>
              <li>Keep it focused on your business to avoid off-topic replies</li>
            </ul>
          </div>
          {!form.customAiPrompt && (
            <p className="text-xs text-gray-400 italic">Currently using the auto-generated prompt based on your business info above.</p>
          )}
          {form.customAiPrompt && (
            <p className="text-xs font-medium text-indigo-600">✓ Custom prompt active — the AI will follow these instructions exactly.</p>
          )}
        </CardContent>
      </Card>

      {/* Bottom save — desktop right-aligned, mobile full-width + sticky */}
      <div className="pb-6">
        <button
          onClick={handleSave}
          disabled={!dirty || updateSettings.isPending}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:float-right px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-green-200 hover:from-green-600 hover:to-green-700 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {updateSettings.isPending ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
          ) : (
            <><Save className="w-4 h-4" />Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}

