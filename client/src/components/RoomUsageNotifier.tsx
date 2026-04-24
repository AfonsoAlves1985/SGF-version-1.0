import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const NOTIFICATION_PERMISSION_REQUESTED_KEY =
  "room-usage-notifier-permission-requested";

type RoomLike = {
  id: number;
  name?: string;
  responsibleUserName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isReleased?: boolean;
};

function normalizePersonName(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseMaskedDate(value?: string | null) {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseRoomDateTime(dateValue?: string | null, timeValue?: string | null, end = false) {
  const date = parseMaskedDate(dateValue);
  if (!date) return null;

  const parsed = new Date(date);

  if (timeValue) {
    const [h, m] = String(timeValue)
      .split(":")
      .map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      parsed.setHours(h, m, 0, 0);
      return parsed;
    }
  }

  if (end) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.48);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch (error) {
    console.error("Falha ao tocar som de notificação de sala:", error);
  }
}

export default function RoomUsageNotifier() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const previousActiveKeysRef = useRef<Set<string>>(new Set());
  const deliveredKeysRef = useRef<Set<string>>(new Set());

  const normalizedUserName = normalizePersonName(user?.name || user?.email);
  const hasUserIdentity = normalizedUserName.length > 0;

  const { data: rooms = [] } = trpc.rooms.list.useQuery(undefined, {
    enabled: hasUserIdentity,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(NOTIFICATION_PERMISSION_REQUESTED_KEY) === "1") return;

    localStorage.setItem(NOTIFICATION_PERMISSION_REQUESTED_KEY, "1");
    void Notification.requestPermission();
  }, []);

  const trackedRooms = useMemo(() => {
    if (!hasUserIdentity) return [];

    const currentTime = now.getTime();

    return (rooms as RoomLike[])
      .filter(room => {
        const responsible = normalizePersonName(room.responsibleUserName);
        return responsible.length > 0 && responsible === normalizedUserName;
      })
      .map(room => {
        const start = parseRoomDateTime(room.startDate, room.startTime);
        const end = parseRoomDateTime(room.endDate, room.endTime, true);
        const roomKey = `${room.id}:${room.endDate || ""}:${room.endTime || ""}`;

        if (!start || !end) {
          return {
            room,
            roomKey,
            isActive: false,
            hasEnded: false,
            endLabel: "",
          };
        }

        const startMs = start.getTime();
        const endMs = end.getTime();

        return {
          room,
          roomKey,
          isActive: !room.isReleased && currentTime >= startMs && currentTime < endMs,
          hasEnded: currentTime >= endMs,
          endLabel: `${room.endDate || ""} ${room.endTime || ""}`.trim(),
        };
      });
  }, [hasUserIdentity, normalizedUserName, now, rooms]);

  useEffect(() => {
    if (!hasUserIdentity) return;

    const activeNow = new Set(
      trackedRooms.filter(item => item.isActive).map(item => item.roomKey)
    );

    trackedRooms.forEach(item => {
      const wasActiveBefore = previousActiveKeysRef.current.has(item.roomKey);
      const justFinished = wasActiveBefore && !item.isActive && item.hasEnded;
      const alreadyDelivered = deliveredKeysRef.current.has(item.roomKey);

      if (!justFinished || alreadyDelivered) return;

      deliveredKeysRef.current.add(item.roomKey);

      const roomName = item.room.name || `Sala #${item.room.id}`;
      const body = item.endLabel
        ? `O uso da sala ${roomName} terminou às ${item.endLabel}.`
        : `O uso da sala ${roomName} terminou.`;

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Uso de sala finalizado", {
            body,
            tag: `room-finished-${item.roomKey}`,
          });
        } else {
          toast.info(body);
        }
      } else {
        toast.info(body);
      }

      playNotificationSound();
    });

    previousActiveKeysRef.current = activeNow;
  }, [hasUserIdentity, trackedRooms]);

  return null;
}
