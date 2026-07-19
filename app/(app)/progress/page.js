"use client";

// ============================================================
// PROGRESS PAGE (reskinned)  —  goes in:  app/(app)/progress/page.js
//
// Day 16 — Progress page v2:
//
//   1. PHOTO MARKERS ON THE WEIGHT CHART: amber dashed lines
//      mark every day you took a progress photo, with a camera
//      toggle next to the range buttons to show/hide them.
//      Under the hood the chart's bottom axis upgraded from
//      evenly-spaced labels to a TRUE TIME AXIS — entries now
//      sit at their real dates, so a 3-week gap looks like a
//      3-week gap and photo markers land exactly where they
//      belong.
//   2. COMPARE PHOTOS: drop-down card under the photo timeline —
//      pick any Before and After, see them side by side with
//      dates, captions, the nearest logged weight to each, and
//      the change between them.
//
// RESKIN: visuals only. Recharts colors are hardcoded hex (they
// can't read the central palette), so they were retuned by hand
// here; the red/amber/emerald meaning is unchanged. Emoji became
// line icons, the summary cards use the metric style, and the
// emerald-filled buttons use dark text. No logic changed.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { hasPremiumAccess } from "../../lib/access";
import PageTour from "../../components/PageTour";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// ---------------- icons (cohesive line set, replaces emoji) ----------------
function Icon({ name, className = "w-4 h-4" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    scale: (
      <>
        <path d="M12 4v16" />
        <path d="M5 7h14" />
        <path d="M9 20h6" />
        <path d="M5 7v5M3 12a2 2 0 0 0 4 0" />
        <path d="M19 7v5M17 12a2 2 0 0 0 4 0" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    camera: (
      <>
        <path d="M3 9a1 1 0 0 1 1-1h2.5l1.2-1.6a1 1 0 0 1 .8-.4h3a1 1 0 0 1 .8.4L14.5 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    chevronDown: <path d="M6 9l6 6 6-6" />,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const UNITS = ["lbs", "kg", "st"];
const MEASUREMENT_UNITS = ["in", "cm"];

// Photo upload rules
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE_MB = 10;
const FREE_PHOTO_LIMIT = 5;

// The four chart range buttons
const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "3m", label: "3 months" },
  { key: "all", label: "All time" },
];

// The five body measurements (key = column name in the database)
const MEASUREMENT_FIELDS = [
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "chest", label: "Chest" },
  { key: "arms", label: "Arms" },
  { key: "thighs", label: "Thighs" },
];

// Shown inside the "How do I measure?" panel
const MEASURE_GUIDE = [
  {
    label: "Waist",
    how: "Wrap the tape level with your belly button after breathing out normally. Don't suck in.",
  },
  {
    label: "Hips",
    how: "Around the widest part of your hips and glutes, with your feet together.",
  },
  {
    label: "Chest",
    how: "Around the fullest part of your chest, tape level all the way around, arms relaxed at your sides.",
  },
  {
    label: "Arms",
    how: "Around the widest part of your upper arm with the arm relaxed. Use the same arm every time.",
  },
  {
    label: "Thighs",
    how: "Around the widest part of your upper thigh. Use the same leg every time.",
  },
];

// ---------------- helper functions ----------------

// Today's date as "YYYY-MM-DD" in YOUR timezone.
// (toISOString() alone uses UTC, which in the evening in Ontario
// would already say "tomorrow" — this avoids that bug.)
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ----- weight unit conversion (lbs / kg / st) -----
function toLbs(value, unit) {
  if (unit === "kg") return value * 2.20462;
  if (unit === "st") return value * 14;
  return value; // already lbs
}

function fromLbs(value, unit) {
  if (unit === "kg") return value / 2.20462;
  if (unit === "st") return value / 14;
  return value;
}

// ----- measurement unit conversion (in / cm) -----
function toInches(value, unit) {
  if (unit === "cm") return value / 2.54;
  return value; // already inches
}

function fromInches(value, unit) {
  if (unit === "cm") return value * 2.54;
  return value;
}

// Turns a database timestamp into e.g. "Jun 10, 2026"
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shorter version for the chart's bottom axis, e.g. "Jun 10"
function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// For a chosen range, returns the earliest date to include
// (or null, which means "include everything").
function getCutoffDate(rangeKey) {
  if (rangeKey === "all") return null;
  const days = rangeKey === "7d" ? 7 : rangeKey === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

// Shared styling for every input on this page (matches the design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

// Empty state for the measurements form
const EMPTY_MEASUREMENTS = {
  waist: "",
  hips: "",
  chest: "",
  arms: "",
  thighs: "",
};

export default function ProgressPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true); // first page load
  const [logs, setLogs] = useState([]); // weight history, newest first
  const [range, setRange] = useState("30d"); // selected chart range

  // weekly weigh-in email preference (this toggle moved here from the dashboard)
  const [weeklyEmail, setWeeklyEmail] = useState(false);

  // weight form fields
  const [unit, setUnit] = useState("lbs");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");

  // weight ui feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----- body measurements -----
  const [measurements, setMeasurements] = useState([]); // history, newest first
  const [mUnit, setMUnit] = useState("in");
  const [mValues, setMValues] = useState(EMPTY_MEASUREMENTS);
  const [mDate, setMDate] = useState(getTodayString());
  const [mNotes, setMNotes] = useState("");
  const [mSaving, setMSaving] = useState(false);
  const [mError, setMError] = useState("");
  const [mSuccess, setMSuccess] = useState("");

  // ----- progress photos -----
  const [photos, setPhotos] = useState([]); // rows + temporary view URLs
  const [isPremium, setIsPremium] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoDate, setPhotoDate] = useState(getTodayString());
  const [uploading, setUploading] = useState(false);
  const [pError, setPError] = useState("");
  const [pSuccess, setPSuccess] = useState("");
  const photoInputRef = useRef(null); // lets us clear the file picker

  // ----- which sections are open -----
  const [showMeasurementsForm, setShowMeasurementsForm] = useState(false);
  const [showMeasureGuide, setShowMeasureGuide] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showMeasurementHistory, setShowMeasurementHistory] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  // ----- Day 16: photo markers + compare -----
  const [showPhotoMarkers, setShowPhotoMarkers] = useState(true); // camera toggle on the chart
  const [showCompare, setShowCompare] = useState(false); // compare card open?
  const [compareBeforeId, setCompareBeforeId] = useState(""); // "" = default (oldest)
  const [compareAfterId, setCompareAfterId] = useState(""); // "" = default (newest)

  // ---------- load session + data when the page opens ----------
  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);
      await fetchLogs(session.user.id);
      await fetchMeasurements(session.user.id);
      await fetchPhotos(session.user.id);
      await fetchProfilePrefs(session.user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch this user's weight history ----------
  async function fetchLogs(uid) {
    const { data, error: fetchError } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setError(
        `Couldn't load weight history: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setLogs(data || []);
    }
  }

  // ---------- fetch this user's measurement history ----------
  async function fetchMeasurements(uid) {
    const { data, error: fetchError } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setMError(
        `Couldn't load measurements: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setMeasurements(data || []);
    }
  }

  // ---------- fetch this user's photos ----------
  async function fetchPhotos(uid) {
    const { data, error: fetchError } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", uid)
      .order("taken_at", { ascending: false });

    if (fetchError) {
      setPError(
        `Couldn't load photos: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
      return;
    }

    if (!data || data.length === 0) {
      setPhotos([]);
      return;
    }

    // The bucket is private, so we ask Supabase for temporary
    // viewing links (valid for 1 hour) for all photos at once.
    const paths = data.map((photo) => photo.storage_path);
    const { data: signed, error: signError } = await supabase.storage
      .from("progress-photos")
      .createSignedUrls(paths, 3600);

    if (signError) {
      setPError(`Couldn't create photo links: ${signError.message}`);
      setPhotos(data.map((photo) => ({ ...photo, url: "" })));
      return;
    }

    const withUrls = data.map((photo, index) => ({
      ...photo,
      url: signed && signed[index] ? signed[index].signedUrl : "",
    }));
    setPhotos(withUrls);
  }

  // ---------- fetch profile prefs (weigh-in email + default units) ----------
async function fetchProfilePrefs(uid) {
    const { data } = await supabase
      .from("profiles")
      .select(
        "weekly_weighin_email, default_weight_unit, default_measurement_unit, subscription_status, subscription_end_date"
      )
      .eq("id", uid)
      .single();
    if (!data) return;
    setWeeklyEmail(data.weekly_weighin_email ? true : false);
    // start the logging forms in the units chosen on the Settings page
    if (data.default_weight_unit) setUnit(data.default_weight_unit);
    if (data.default_measurement_unit) setMUnit(data.default_measurement_unit);
    // premium unlocks unlimited progress photos
    setIsPremium(hasPremiumAccess(data));
  }
  // ---------- toggle the weekly weigh-in email preference ----------
  async function handleToggleWeeklyEmail() {
    const next = !weeklyEmail;
    setWeeklyEmail(next); // optimistic — flip the checkbox immediately

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ weekly_weighin_email: next })
      .eq("id", userId);

    if (updateError) {
      setWeeklyEmail(!next); // revert if the save didn't go through
    }
  }

  // ---------- save a new weight entry ----------
  async function handleSave() {
    setError("");
    setSuccess("");

    // validation
    const weightNumber = parseFloat(weight);
    if (!weight || isNaN(weightNumber) || weightNumber <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    const bodyFatNumber = bodyFat === "" ? null : parseFloat(bodyFat);
    if (
      bodyFatNumber !== null &&
      (isNaN(bodyFatNumber) || bodyFatNumber < 0 || bodyFatNumber > 100)
    ) {
      setError("Body fat % must be between 0 and 100 (or leave it blank).");
      return;
    }

    if (!date || date > today) {
      setError("Please pick today's date or an earlier one.");
      return;
    }

    setSaving(true);

    // The T12:00:00 saves the entry at noon on the chosen day,
    // which stops the date from shifting backwards/forwards a day
    // when timezones get involved.
    const { error: insertError } = await supabase.from("weight_logs").insert({
      user_id: userId,
      weight: weightNumber,
      unit: unit,
      body_fat_percentage: bodyFatNumber,
      notes: notes.trim() === "" ? null : notes.trim(),
      logged_at: new Date(`${date}T12:00:00`).toISOString(),
    });

    setSaving(false);

    if (insertError) {
      setError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    // success: clear the form, reload + open the history, brief banner
    setSuccess("Weight saved!");
    setWeight("");
    setBodyFat("");
    setNotes("");
    setDate(getTodayString());
    fetchLogs(userId);
    setShowWeightHistory(true); // so you see the new entry land
    setTimeout(() => setSuccess(""), 4000);
  }

  // ---------- save a new measurements entry ----------
  async function handleSaveMeasurements() {
    setMError("");
    setMSuccess("");

    // Build the row: filled fields become numbers, blanks become null
    const row = {};
    let filledCount = 0;

    for (const field of MEASUREMENT_FIELDS) {
      const raw = mValues[field.key];
      if (raw === "") {
        row[field.key] = null;
      } else {
        const number = parseFloat(raw);
        if (isNaN(number) || number <= 0) {
          setMError(
            `${field.label} must be a number above 0 (or leave it blank).`
          );
          return;
        }
        row[field.key] = number;
        filledCount = filledCount + 1;
      }
    }

    if (filledCount === 0) {
      setMError("Enter at least one measurement.");
      return;
    }

    if (!mDate || mDate > today) {
      setMError("Please pick today's date or an earlier one.");
      return;
    }

    setMSaving(true);

    const { error: insertError } = await supabase
      .from("body_measurements")
      .insert({
        user_id: userId,
        ...row,
        unit: mUnit,
        notes: mNotes.trim() === "" ? null : mNotes.trim(),
        logged_at: new Date(`${mDate}T12:00:00`).toISOString(),
      });

    setMSaving(false);

    if (insertError) {
      setMError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    setMSuccess("Measurements saved!");
    setMValues(EMPTY_MEASUREMENTS);
    setMNotes("");
    setMDate(getTodayString());
    fetchMeasurements(userId);
    setShowMeasurementHistory(true); // so you see the new entry land
    setTimeout(() => setMSuccess(""), 4000);
  }

  // ---------- choose a photo file ----------
  function handleFileChange(event) {
    setPError("");
    const file =
      event.target.files && event.target.files.length > 0
        ? event.target.files[0]
        : null;

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPError(
        "Please choose a JPG, PNG, or WebP image. (iPhone HEIC photos need to be saved as JPG first.)"
      );
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      setPError(
        `That image is over ${MAX_PHOTO_SIZE_MB} MB — please choose a smaller one.`
      );
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    // show a preview before uploading
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // ---------- upload a photo ----------
  async function handleUploadPhoto() {
    setPError("");
    setPSuccess("");

    if (!photoFile) {
      setPError("Choose a photo first.");
      return;
    }
    if (!isPremium && photos.length >= FREE_PHOTO_LIMIT) {
      setPError(
        `The free plan includes up to ${FREE_PHOTO_LIMIT} progress photos. Upgrade to Premium for unlimited.`
      );
      return;
    }
    if (!photoDate || photoDate > today) {
      setPError("Please pick today's date or an earlier one.");
      return;
    }

    setUploading(true);

    // The file goes into a folder named after YOUR user id —
    // the Storage policies only allow access to your own folder.
    // Date.now() makes every filename unique.
    const nameParts = photoFile.name.split(".");
    const extension =
      nameParts.length > 1 ? nameParts.pop().toLowerCase() : "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, photoFile);

    if (uploadError) {
      setUploading(false);
      let message = `Upload failed: ${uploadError.message}`;
      if (
        uploadError.message &&
        uploadError.message.toLowerCase().includes("row-level security")
      ) {
        message =
          message +
          " — this means the Storage policies (Part C) aren't in place yet.";
      }
      setPError(message);
      return;
    }

    // The image is in Storage — now record it in the database
    const { error: insertError } = await supabase
      .from("progress_photos")
      .insert({
        user_id: userId,
        storage_path: path,
        caption: photoCaption.trim() === "" ? null : photoCaption.trim(),
        taken_at: new Date(`${photoDate}T12:00:00`).toISOString(),
      });

    if (insertError) {
      // Don't leave an orphaned image in Storage if the record failed
      await supabase.storage.from("progress-photos").remove([path]);
      setUploading(false);
      setPError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    setUploading(false);
    setPSuccess("Photo uploaded!");
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    setPhotoCaption("");
    setPhotoDate(getTodayString());
    if (photoInputRef.current) photoInputRef.current.value = "";
    fetchPhotos(userId);
    setShowPhotos(true); // so you see the new photo land
    setTimeout(() => setPSuccess(""), 4000);
  }

  // ---------- delete a photo ----------
  async function handleDeletePhoto(photo) {
    const sure = window.confirm("Delete this photo? This can't be undone.");
    if (!sure) return;

    setPError("");

    // 1) remove the image file from Storage
    const { error: storageError } = await supabase.storage
      .from("progress-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      setPError(`Couldn't delete the image file: ${storageError.message}`);
      return;
    }

    // 2) remove its record from the database
    const { error: deleteError } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", userId);

    if (deleteError) {
      setPError(
        `Couldn't delete the photo record: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setPhotos((previous) =>
        previous.filter((item) => item.id !== photo.id)
      );
    }
  }

  // ---------- delete a weight entry ----------
  async function handleDelete(id) {
    const sure = window.confirm("Delete this weight entry?");
    if (!sure) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("weight_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        `Couldn't delete entry: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setLogs((previous) => previous.filter((log) => log.id !== id));
    }
  }

  // ---------- delete a measurements entry ----------
  async function handleDeleteMeasurement(id) {
    const sure = window.confirm("Delete this measurements entry?");
    if (!sure) return;

    setMError("");
    const { error: deleteError } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setMError(
        `Couldn't delete entry: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setMeasurements((previous) =>
        previous.filter((entry) => entry.id !== id)
      );
    }
  }

  // ---------- handle typing in the measurement inputs ----------
  function handleMeasurementChange(key, value) {
    setMValues((previous) => ({ ...previous, [key]: value }));
  }

  // ---------- summary numbers (computed from logs) ----------
  const newest = logs.length > 0 ? logs[0] : null;
  const oldest = logs.length > 0 ? logs[logs.length - 1] : null;

  // ---------- weekly weigh-in nudge ----------
  // Whole days since your most recent weigh-in (null = no weigh-ins yet).
  // We compare midnight-to-midnight so a weigh-in "yesterday evening" reads
  // as 1 day, not a fraction.
  let daysSinceWeighin = null;
  if (newest) {
    const last = new Date(newest.logged_at);
    const lastMidnight = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate()
    );
    const now = new Date();
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    daysSinceWeighin = Math.round((todayMidnight - lastMidnight) / 86400000);
  }
  const weighinOverdue = daysSinceWeighin === null || daysSinceWeighin >= 7;
  const weighinMessage =
    daysSinceWeighin === null
      ? "Log your first weight below to start tracking your progress."
      : daysSinceWeighin === 0
      ? "You weighed in today. Nice."
      : daysSinceWeighin >= 7
      ? `It's been ${daysSinceWeighin} days since your last weigh-in — log one below.`
      : `Last weigh-in: ${daysSinceWeighin} ${
          daysSinceWeighin === 1 ? "day" : "days"
        } ago.`;

  // Total change since the first entry, shown in the newest entry's unit.
  let totalChange = null;
  if (logs.length > 1) {
    const differenceInLbs =
      toLbs(parseFloat(newest.weight), newest.unit) -
      toLbs(parseFloat(oldest.weight), oldest.unit);
    totalChange = fromLbs(differenceInLbs, newest.unit);
  }

  // Change vs. the previous entry, for the little arrow on each row.
  function deltaForRow(index) {
    const current = logs[index];
    const previous = logs[index + 1]; // list is newest-first
    if (!previous) return null;
    const differenceInLbs =
      toLbs(parseFloat(current.weight), current.unit) -
      toLbs(parseFloat(previous.weight), previous.unit);
    return fromLbs(differenceInLbs, current.unit);
  }

  // Day 16: the weight entry logged closest in time to a given
  // timestamp — used by the compare card to caption each photo.
  function nearestWeightTo(ts) {
    let best = null;
    for (const log of logs) {
      const diff = Math.abs(new Date(log.logged_at).getTime() - ts);
      if (best === null || diff < best.diff) {
        best = { log: log, diff: diff };
      }
    }
    return best; // { log, diff } or null when there are no weights
  }

  // Trend for one measurement: compares against the most recent OLDER
  // entry that actually has that measurement filled in (entries can
  // have blanks, so "the previous entry" isn't always enough).
  function measurementDeltaForRow(index, fieldKey) {
    const current = measurements[index];
    const currentValue = current[fieldKey];
    if (currentValue === null || currentValue === undefined) return null;

    for (let i = index + 1; i < measurements.length; i++) {
      const older = measurements[i];
      const olderValue = older[fieldKey];
      if (olderValue !== null && olderValue !== undefined) {
        const differenceInInches =
          toInches(parseFloat(currentValue), current.unit) -
          toInches(parseFloat(olderValue), older.unit);
        return fromInches(differenceInInches, current.unit);
      }
    }
    return null; // nothing older to compare against
  }

  // ---------- chart data ----------
  // The chart shows everything in ONE unit (the newest entry's unit),
  // so entries logged in different units still draw one smooth line.
  const chartUnit = newest ? newest.unit : "lbs";
  const hasMixedUnits = logs.some((log) => log.unit !== chartUnit);

  const cutoff = getCutoffDate(range);
  const chartData = logs
    .filter((log) => cutoff === null || new Date(log.logged_at) >= cutoff)
    .reverse() // oldest first, so the line reads left → right
    .map((log) => ({
      ts: new Date(log.logged_at).getTime(), // real position in time
      weight: Number(
        fromLbs(toLbs(parseFloat(log.weight), log.unit), chartUnit).toFixed(1)
      ),
    }));

  // The chart's visible time window: range start → now
  // (on "All time" it starts at your first entry).
  const domainEnd = Date.now();
  const domainStart =
    cutoff !== null
      ? cutoff.getTime()
      : chartData.length > 0
      ? chartData[0].ts
      : domainEnd - 86400000;

  // Photo markers that fall inside the window (when toggled on)
  const photoMarkers = showPhotoMarkers
    ? photos.filter((photo) => {
        const ts = new Date(photo.taken_at).getTime();
        return ts >= domainStart && ts <= domainEnd;
      })
    : [];

  // ---------- Day 16: compare-card selections ----------
  // Defaults: oldest photo as Before, newest as After (the photos
  // list is newest-first). Picking from the dropdowns overrides.
  const beforePhoto =
    photos.find((photo) => photo.id === compareBeforeId) ||
    (photos.length > 0 ? photos[photos.length - 1] : null);
  const afterPhoto =
    photos.find((photo) => photo.id === compareAfterId) ||
    (photos.length > 0 ? photos[0] : null);

  const beforeTs = beforePhoto
    ? new Date(beforePhoto.taken_at).getTime()
    : null;
  const afterTs = afterPhoto ? new Date(afterPhoto.taken_at).getTime() : null;
  const beforeNearest = beforeTs !== null ? nearestWeightTo(beforeTs) : null;
  const afterNearest = afterTs !== null ? nearestWeightTo(afterTs) : null;

  // Weight change between the two photos' nearest weigh-ins,
  // shown in the chart unit.
  let compareChange = null;
  let compareDays = null;
  if (
    beforeNearest &&
    afterNearest &&
    beforePhoto &&
    afterPhoto &&
    beforePhoto.id !== afterPhoto.id
  ) {
    const differenceInLbs =
      toLbs(parseFloat(afterNearest.log.weight), afterNearest.log.unit) -
      toLbs(parseFloat(beforeNearest.log.weight), beforeNearest.log.unit);
    compareChange = fromLbs(differenceInLbs, chartUnit);
    compareDays = Math.round(Math.abs(afterTs - beforeTs) / 86400000);
  }

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your progress...</p>
      </div>
    );
  }

  return (
    // If this page looks "double padded" compared to your dashboard,
    // your layout.js already adds padding — change p-8 below to p-0.
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* ---------- guided tour of this page ---------- */}
      <PageTour
        tourKey="progress"
        steps={[
          {
            target: '[data-tour="weighin"]',
            title: "Your weigh-in nudge",
            body: "Tells you how long it's been since your last weigh-in and turns amber past a week. Tick the box and we'll email you a weekly reminder.",
          },
          {
            target: '[data-tour="log-weight"]',
            title: "Logging a weight",
            body: "Pick lbs, kg or stone — you can switch any time and older entries convert automatically. Body fat and notes are optional, and you can backdate an entry.",
          },
          {
            target: '[data-tour="summary"]',
            title: "Where you started, where you are",
            body: "Your latest weight, your very first entry, and the total change between them.",
          },
          {
            target: '[data-tour="chart"]',
            title: "The trend",
            body: "A real time axis, so a three-week gap actually looks like three weeks. Switch the range to zoom from the last 7 days out to all time.",
          },
          {
            target: '[data-tour="photo-toggle"]',
            title: "Photo days on the chart",
            body: "Toggles amber dashed lines onto the graph marking every day you took a progress photo — so you can see exactly what your weight was doing when a photo was taken.",
          },
          {
            target: '[data-tour="measurements"]',
            title: "Measurements catch what the scale misses",
            body: "Waist, hips, chest, arms and thighs — all optional. Useful when the scale stalls but you're still changing shape. There's a short how-to-measure guide inside.",
          },
          {
            target: '[data-tour="photos"]',
            title: "Private progress photos",
            body: "Stored privately to your account — nobody else can see them. The free plan includes 5; premium is unlimited.",
          },
          {
            target: '[data-tour="compare"]',
            title: "Before and after",
            body: "Pick any two photos and see them side by side, each captioned with the weigh-in closest to that date, plus the change between them.",
          },
        ]}
      />

      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Progress</h1>
        <p className="text-slate-400 mt-1">
          Log your weight and watch the trend over time.
        </p>
      </div>

      {/* ---------- weekly weigh-in nudge + email opt-in ---------- */}
      <div
        data-tour="weighin"
        className={`bg-slate-900 rounded-xl p-6 border ${
          weighinOverdue ? "border-amber-500/40" : "border-slate-800"
        }`}
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon name="scale" className="w-5 h-5" />
          Weekly weigh-in
        </h2>
        <p
          className={`text-sm mt-1 ${
            weighinOverdue ? "text-amber-400" : "text-slate-500"
          }`}
        >
          {weighinMessage}
        </p>

        <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={weeklyEmail}
            onChange={handleToggleWeeklyEmail}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-sm text-slate-300 flex items-center gap-1.5">
            <Icon name="mail" className="w-4 h-4" />
            Email me a weekly weigh-in reminder
          </span>
        </label>
      </div>

      {/* ---------- summary cards (only once there's data) ---------- */}
      {newest && (
        <div data-tour="summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Current weight
            </p>
            <p className="text-[26px] leading-none font-semibold text-white mt-3">
              {parseFloat(newest.weight).toFixed(1)} {newest.unit}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {formatDate(newest.logged_at)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Starting weight
            </p>
            <p className="text-[26px] leading-none font-semibold text-white mt-3">
              {parseFloat(oldest.weight).toFixed(1)} {oldest.unit}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {formatDate(oldest.logged_at)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Change
            </p>
            <p className="text-[26px] leading-none font-semibold text-white mt-3">
              {totalChange === null
                ? "—"
                : totalChange <= -0.05
                ? `↓ ${Math.abs(totalChange).toFixed(1)} ${newest.unit}`
                : totalChange >= 0.05
                ? `↑ ${totalChange.toFixed(1)} ${newest.unit}`
                : `0.0 ${newest.unit}`}
            </p>
            <p className="text-sm text-slate-500 mt-2">since first entry</p>
          </div>
        </div>
      )}

      {/* ---------- weight-over-time chart ---------- */}
      {newest && (
        <div
          data-tour="chart"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white">
              Weight over time
            </h2>

            {/* range filter buttons + photo-marker toggle */}
            <div className="flex flex-wrap gap-2">
              {RANGES.map((rangeOption) => (
                <button
                  key={rangeOption.key}
                  type="button"
                  onClick={() => setRange(rangeOption.key)}
                  className={
                    rangeOption.key === range
                      ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-sm font-semibold"
                      : "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
                  }
                >
                  {rangeOption.label}
                </button>
              ))}

              {photos.length > 0 && (
                <button
                  type="button"
                  data-tour="photo-toggle"
                  onClick={() => setShowPhotoMarkers((previous) => !previous)}
                  title="Show photo days on the chart"
                  className={
                    showPhotoMarkers
                      ? "px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold inline-flex items-center gap-1.5"
                      : "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 inline-flex items-center gap-1.5"
                  }
                >
                  <Icon name="camera" className="w-4 h-4" />
                  Photos
                </button>
              )}
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-slate-500">
              No entries in this range yet — try "All time".
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid stroke="#1F2926" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    scale="time"
                    domain={[domainStart, domainEnd]}
                    tickFormatter={(ts) => formatShortDate(ts)}
                    tick={{ fill: "#8A9693", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2A3431" }}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#8A9693", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2A3431" }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#131A18",
                      border: "1px solid #2A3431",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#8A9693" }}
                    itemStyle={{ color: "#4FD6B4" }}
                    labelFormatter={(ts) => formatDate(ts)}
                    formatter={(value) => [`${value} ${chartUnit}`, "Weight"]}
                  />

                  {/* a dashed amber line on every photo day */}
                  {photoMarkers.map((photo) => (
                    <ReferenceLine
                      key={photo.id}
                      x={new Date(photo.taken_at).getTime()}
                      stroke="#E0A23A"
                      strokeDasharray="4 4"
                      strokeOpacity={0.7}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#1FB089"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#1FB089", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {showPhotoMarkers && photoMarkers.length > 0 && (
            <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5">
              <Icon name="camera" className="w-3.5 h-3.5" />
              Dashed lines mark days you took a progress photo.
            </p>
          )}

          {hasMixedUnits && (
            <p className="text-sm text-slate-500 mt-3">
              Shown in {chartUnit} — entries logged in other units are
              converted automatically.
            </p>
          )}
        </div>
      )}

      {/* ================================================
          SIDE-BY-SIDE: weight (left) | measurements + photos (right)
          Stacks into one column on phones.
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: weight ---------- */}
        <div className="space-y-6">
          {/* log weight form */}
          <div
            data-tour="log-weight"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              Log weight
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
                {success}
              </div>
            )}

            {/* unit toggle */}
            <div className="flex gap-2 mb-4">
              {UNITS.map((unitOption) => (
                <button
                  key={unitOption}
                  type="button"
                  onClick={() => setUnit(unitOption)}
                  className={
                    unitOption === unit
                      ? "px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold"
                      : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }
                >
                  {unitOption}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Weight ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Body fat %{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 24.5"
                  value={bodyFat}
                  onChange={(event) => setBodyFat(event.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  className={`${inputClasses} [color-scheme:dark]`}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Notes <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. morning weigh-in"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save entry"}
            </button>
          </div>

          {/* weight history — drop-down */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <button
              type="button"
              onClick={() => setShowWeightHistory((previous) => !previous)}
              aria-expanded={showWeightHistory}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-white">
                Weight history{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({logs.length})
                </span>
              </h2>
              <span className="text-slate-400">
                <Icon name={showWeightHistory ? "chevronDown" : "chevronRight"} className="w-4 h-4" />
              </span>
            </button>

            {showWeightHistory && (
              <div className="mt-4">
                {logs.length === 0 ? (
                  <p className="text-slate-500">
                    No entries yet — log your first weight and it will show up
                    here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {logs.map((log, index) => {
                      const delta = deltaForRow(index);
                      return (
                        <li
                          key={log.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-white font-semibold">
                              {parseFloat(log.weight).toFixed(1)} {log.unit}
                              {log.body_fat_percentage !== null &&
                                log.body_fat_percentage !== undefined && (
                                  <span className="text-slate-400 font-normal text-sm">
                                    {" "}
                                    ·{" "}
                                    {parseFloat(
                                      log.body_fat_percentage
                                    ).toFixed(1)}
                                    % body fat
                                  </span>
                                )}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatDate(log.logged_at)}
                              {log.notes ? ` — ${log.notes}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            {delta !== null && (
                              <span
                                className={
                                  delta <= -0.05
                                    ? "text-emerald-400 text-sm font-medium"
                                    : delta >= 0.05
                                    ? "text-slate-400 text-sm font-medium"
                                    : "text-slate-500 text-sm"
                                }
                              >
                                {delta <= -0.05
                                  ? `↓ ${Math.abs(delta).toFixed(1)}`
                                  : delta >= 0.05
                                  ? `↑ ${delta.toFixed(1)}`
                                  : "—"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(log.id)}
                              className="text-slate-500 hover:text-red-400"
                              title="Delete entry"
                            >
                              <Icon name="close" className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- RIGHT COLUMN: measurements + photos ---------- */}
        <div className="space-y-6">
          {/* measurements form — optional, opens on click */}
          <div
            data-tour="measurements"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <button
              type="button"
              onClick={() => setShowMeasurementsForm((previous) => !previous)}
              aria-expanded={showMeasurementsForm}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Body measurements
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Optional — waist, hips, chest, arms, thighs
                </p>
              </div>
              <span className="text-slate-400">
                <Icon name={showMeasurementsForm ? "chevronDown" : "chevronRight"} className="w-4 h-4" />
              </span>
            </button>

            {/* banners sit outside the fold so errors are never hidden */}
            {mError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mt-4">
                {mError}
              </div>
            )}
            {mSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mt-4">
                {mSuccess}
              </div>
            )}

            {showMeasurementsForm && (
              <div className="mt-4">
                {/* how-to-measure guide */}
                <button
                  type="button"
                  onClick={() => setShowMeasureGuide((previous) => !previous)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
                >
                  <Icon name={showMeasureGuide ? "chevronDown" : "chevronRight"} className="w-3.5 h-3.5" />
                  How do I measure?
                </button>

                {showMeasureGuide && (
                  <div className="bg-slate-800/50 rounded-lg p-4 mt-3 space-y-2">
                    {MEASURE_GUIDE.map((item) => (
                      <p key={item.label} className="text-sm">
                        <span className="text-white font-medium">
                          {item.label}:
                        </span>{" "}
                        <span className="text-slate-400">{item.how}</span>
                      </p>
                    ))}
                    <p className="text-sm text-slate-500 pt-1">
                      Tips: use a soft tape measure on bare skin, keep it snug
                      but not digging in, and measure at the same time of day
                      (mornings are most consistent). Consistency matters more
                      than precision.
                    </p>
                  </div>
                )}

                {/* in / cm toggle */}
                <div className="flex gap-2 mt-4 mb-4">
                  {MEASUREMENT_UNITS.map((unitOption) => (
                    <button
                      key={unitOption}
                      type="button"
                      onClick={() => setMUnit(unitOption)}
                      className={
                        unitOption === mUnit
                          ? "px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold"
                          : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }
                    >
                      {unitOption}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-slate-400 mb-1">
                        {field.label} ({mUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={mValues[field.key]}
                        onChange={(event) =>
                          handleMeasurementChange(
                            field.key,
                            event.target.value
                          )
                        }
                        className={inputClasses}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={mDate}
                      max={today}
                      onChange={(event) => setMDate(event.target.value)}
                      className={`${inputClasses} [color-scheme:dark]`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-1">
                    Notes <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. measured after workout"
                    value={mNotes}
                    onChange={(event) => setMNotes(event.target.value)}
                    className={inputClasses}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveMeasurements}
                  disabled={mSaving}
                  className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
                >
                  {mSaving ? "Saving..." : "Save measurements"}
                </button>
              </div>
            )}
          </div>

          {/* measurement history — drop-down */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <button
              type="button"
              onClick={() =>
                setShowMeasurementHistory((previous) => !previous)
              }
              aria-expanded={showMeasurementHistory}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-white">
                Measurement history{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({measurements.length})
                </span>
              </h2>
              <span className="text-slate-400">
                <Icon name={showMeasurementHistory ? "chevronDown" : "chevronRight"} className="w-4 h-4" />
              </span>
            </button>

            {showMeasurementHistory && (
              <div className="mt-4">
                {measurements.length === 0 ? (
                  <p className="text-slate-500">
                    No measurements yet — log your first set and it will show
                    up here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {measurements.map((entry, index) => (
                      <li key={entry.id} className="py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-500">
                              {formatDate(entry.logged_at)}
                              {entry.notes ? ` — ${entry.notes}` : ""}
                            </p>

                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
                              {MEASUREMENT_FIELDS.map((field) => {
                                const value = entry[field.key];
                                if (value === null || value === undefined) {
                                  return null;
                                }
                                const delta = measurementDeltaForRow(
                                  index,
                                  field.key
                                );
                                return (
                                  <span key={field.key} className="text-sm">
                                    <span className="text-slate-500">
                                      {field.label}{" "}
                                    </span>
                                    <span className="text-white font-semibold">
                                      {parseFloat(value).toFixed(1)}{" "}
                                      {entry.unit}
                                    </span>
                                    {delta !== null && delta <= -0.05 && (
                                      <span className="text-emerald-400 font-medium">
                                        {" "}
                                        ↓{Math.abs(delta).toFixed(1)}
                                      </span>
                                    )}
                                    {delta !== null && delta >= 0.05 && (
                                      <span className="text-slate-400 font-medium">
                                        {" "}
                                        ↑{delta.toFixed(1)}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMeasurement(entry.id)}
                            className="text-slate-500 hover:text-red-400"
                            title="Delete entry"
                          >
                            <Icon name="close" className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* progress photos — drop-down (moved up here from the bottom) */}
          <div
            data-tour="photos"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <button
              type="button"
              onClick={() => setShowPhotos((previous) => !previous)}
              aria-expanded={showPhotos}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Progress photos{" "}
                  <span className="text-sm font-normal text-slate-500">
                    ({photos.length})
                  </span>
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Optional — private before &amp; after timeline, only you can
                  see these
                </p>
              </div>
              <span className="text-slate-400">
                <Icon name={showPhotos ? "chevronDown" : "chevronRight"} className="w-4 h-4" />
              </span>
            </button>

            {/* banners sit outside the fold so errors are never hidden */}
            {pError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mt-4">
                {pError}
              </div>
            )}
            {pSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mt-4">
                {pSuccess}
              </div>
            )}

            {showPhotos && (
              <div className="mt-4">
                {!isPremium && (
                  <div className="mb-4 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm">
                    <p className="text-slate-300">
                      Free plan:{" "}
                      <span className="text-white font-medium">
                        {photos.length} of {FREE_PHOTO_LIMIT}
                      </span>{" "}
                      photos used.
                    </p>
                    {photos.length >= FREE_PHOTO_LIMIT && (
                      <a
                        href="/pricing"
                        className="block mt-1 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        Upgrade for unlimited photos
                      </a>
                    )}
                  </div>
                )}
                {/* upload form */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Photo{" "}
                    <span className="text-slate-500">
                      (JPG, PNG, or WebP — up to {MAX_PHOTO_SIZE_MB} MB)
                    </span>
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white file:font-semibold hover:file:bg-slate-600 file:cursor-pointer"
                  />
                  {photoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="Preview of the selected photo"
                      className="mt-3 h-32 rounded-lg object-cover border border-slate-700"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Date taken
                    </label>
                    <input
                      type="date"
                      value={photoDate}
                      max={today}
                      onChange={(event) => setPhotoDate(event.target.value)}
                      className={`${inputClasses} [color-scheme:dark]`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Caption{" "}
                      <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. week 8"
                      value={photoCaption}
                      onChange={(event) =>
                        setPhotoCaption(event.target.value)
                      }
                      className={inputClasses}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={uploading}
                  className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload photo"}
                </button>

                {/* timeline grid */}
                {photos.length === 0 ? (
                  <p className="text-slate-500 mt-6">
                    No photos yet — upload your first one above. Photos are
                    private to your account.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700"
                      >
                        {photo.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.url}
                            alt={photo.caption || "Progress photo"}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center text-slate-500 text-sm">
                            Couldn't load image
                          </div>
                        )}

                        <div className="p-3">
                          <p className="text-sm text-white font-medium">
                            {formatDate(photo.taken_at)}
                          </p>
                          {photo.caption && (
                            <p className="text-sm text-slate-400 mt-0.5">
                              {photo.caption}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo)}
                          className="absolute top-2 right-2 bg-slate-950/70 hover:bg-red-500/80 text-white rounded-lg px-2 py-1 inline-flex items-center justify-center"
                          title="Delete photo"
                        >
                          <Icon name="close" className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Day 16: compare photos — drop-down */}
          <div
            data-tour="compare"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <button
              type="button"
              onClick={() => setShowCompare((previous) => !previous)}
              aria-expanded={showCompare}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Compare photos
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Before &amp; after, side by side
                </p>
              </div>
              <span className="text-slate-400">
                <Icon name={showCompare ? "chevronDown" : "chevronRight"} className="w-4 h-4" />
              </span>
            </button>

            {showCompare && (
              <div className="mt-4">
                {photos.length < 2 ? (
                  <p className="text-slate-500">
                    Upload at least two photos and you can compare any pair
                    here.
                  </p>
                ) : (
                  <>
                    {/* pickers — default to oldest vs newest */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">
                          Before
                        </label>
                        <select
                          value={beforePhoto ? beforePhoto.id : ""}
                          onChange={(event) =>
                            setCompareBeforeId(event.target.value)
                          }
                          className={inputClasses}
                        >
                          {photos.map((photo) => (
                            <option key={photo.id} value={photo.id}>
                              {formatDate(photo.taken_at)}
                              {photo.caption ? ` — ${photo.caption}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-1">
                          After
                        </label>
                        <select
                          value={afterPhoto ? afterPhoto.id : ""}
                          onChange={(event) =>
                            setCompareAfterId(event.target.value)
                          }
                          className={inputClasses}
                        >
                          {photos.map((photo) => (
                            <option key={photo.id} value={photo.id}>
                              {formatDate(photo.taken_at)}
                              {photo.caption ? ` — ${photo.caption}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          tag: "Before",
                          photo: beforePhoto,
                          nearest: beforeNearest,
                        },
                        {
                          tag: "After",
                          photo: afterPhoto,
                          nearest: afterNearest,
                        },
                      ].map((side) => (
                        <div
                          key={side.tag}
                          className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700"
                        >
                          {side.photo && side.photo.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={side.photo.url}
                              alt={`${side.tag} progress photo`}
                              className="w-full h-56 object-cover"
                            />
                          ) : (
                            <div className="w-full h-56 flex items-center justify-center text-slate-500 text-sm">
                              Couldn't load image
                            </div>
                          )}

                          <div className="p-3">
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                              {side.tag}
                            </p>
                            <p className="text-sm text-white font-medium mt-0.5">
                              {side.photo
                                ? formatDate(side.photo.taken_at)
                                : "—"}
                            </p>
                            {side.photo && side.photo.caption && (
                              <p className="text-sm text-slate-400 mt-0.5">
                                {side.photo.caption}
                              </p>
                            )}
                            {side.nearest && (
                              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <Icon name="scale" className="w-3.5 h-3.5" />
                                {parseFloat(
                                  side.nearest.log.weight
                                ).toFixed(1)}{" "}
                                {side.nearest.log.unit}
                                <span className="text-slate-500">
                                  {" "}
                                  · {formatDate(side.nearest.log.logged_at)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* the change line */}
                    {compareChange !== null && (
                      <p className="text-center mt-4 text-base">
                        {compareChange <= -0.05 ? (
                          <span className="text-emerald-400 font-semibold">
                            ↓ {Math.abs(compareChange).toFixed(1)} {chartUnit}
                          </span>
                        ) : compareChange >= 0.05 ? (
                          <span className="text-slate-300 font-semibold">
                            ↑ {compareChange.toFixed(1)} {chartUnit}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">
                            No change
                          </span>
                        )}
                        <span className="text-slate-500">
                          {" "}
                          over {compareDays}{" "}
                          {compareDays === 1 ? "day" : "days"}
                        </span>
                      </p>
                    )}

                    {beforeTs !== null &&
                      afterTs !== null &&
                      afterTs < beforeTs && (
                        <p className="text-xs text-slate-500 text-center mt-2">
                          Heads up: your "After" photo is older than your
                          "Before" — swap them for a chronological
                          comparison.
                        </p>
                      )}

                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                      <Icon name="scale" className="w-3.5 h-3.5" />
                      Weight shown is the weigh-in logged closest to each
                      photo's date.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}