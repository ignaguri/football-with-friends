// @ts-nocheck - Tamagui type recursion workaround
import { MediaGrid, MediaLightbox } from "@repo/ui";
import { api, client, useQuery, useMutation, useQueryClient } from "@repo/api-client";
import { useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ActionSheetIOS, Alert, Platform, Pressable, RefreshControl, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Plus } from "@tamagui/lucide-icons";
import { Container, Text, YStack, XStack, Button } from "@repo/ui";
import { useSession, getConfiguredApiUrl } from "@repo/api-client";
import type { MatchMedia, ReactionEmoji } from "@repo/shared/domain";

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export default function MatchGalleryScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["matchMedia", matchId],
    queryFn: async () => {
      const res = await api.api["match-media"][":matchId"].$get({ param: { matchId } });
      if (!res.ok) throw new Error("Failed to load gallery");
      return (await res.json()) as { items: MatchMedia[] };
    },
  });

  const items = data?.items ?? [];
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "admin";

  // Fetch the match to get the server-authoritative `isUserSignedUp` flag so we
  // can gate the Upload button client-side (server still enforces on POST).
  const { data: match } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const res = await client.api.matches[":id"].$get({
        param: { id: matchId! },
        query: { userId: userId || "" },
      });
      if (!res.ok) return null;
      return res.json() as Promise<{ isUserSignedUp?: boolean }>;
    },
    enabled: !!matchId && !!userId,
  });

  const canUpload = !!userId && (match?.isUserSignedUp === true || isAdmin);

  const canDelete = useCallback(
    (item: MatchMedia) => !!userId && (item.uploaderUserId === userId || isAdmin),
    [userId, isAdmin]
  );

  // --- Upload ---
  const openUpload = async () => {
    if (!canUpload || uploading) return;
    const options = [t("multimedia.pickPhoto"), t("multimedia.pickVideo"), t("multimedia.cancel")];
    const cancelIndex = 2;

    const pick = async (which: "photo" | "video") => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          which === "photo"
            ? ImagePicker.MediaTypeOptions.Images
            : ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 30,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      await submitUpload(asset, which);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (i) => {
          if (i === 0) void pick("photo");
          if (i === 1) void pick("video");
        }
      );
    } else if (Platform.OS === "web") {
      // RN Web's Alert.alert doesn't render custom button arrays — it falls
      // through to window.alert(title, message), ignoring buttons. Use the
      // browser's native file picker with All media types and derive the kind
      // from the picked asset's type.
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        videoMaxDuration: 30,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const kind: "photo" | "video" = asset.type === "video" ? "video" : "photo";
      await submitUpload(asset, kind);
    } else {
      Alert.alert(t("multimedia.upload"), undefined, [
        { text: t("multimedia.pickPhoto"), onPress: () => void pick("photo") },
        { text: t("multimedia.pickVideo"), onPress: () => void pick("video") },
        { text: t("multimedia.cancel"), style: "cancel" },
      ]);
    }
  };

  const submitUpload = async (
    asset: ImagePicker.ImagePickerAsset,
    kind: "photo" | "video"
  ) => {
    try {
      setUploading(true);

      let fileUri = asset.uri;
      let fileMime = asset.mimeType ?? (kind === "photo" ? "image/jpeg" : "video/mp4");
      let fileName = kind === "photo" ? "photo.webp" : "video.mp4";

      if (kind === "photo") {
        const processed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.WEBP }
        );
        fileUri = processed.uri;
        fileMime = "image/webp";
        fileName = "photo.webp";
      }

      let posterUri: string | null = null;
      if (kind === "video") {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
          posterUri = thumb.uri;
        } catch {
          posterUri = null;
        }
      }

      // Size check (approximate — native doesn't always expose size)
      if (kind === "video" && asset.fileSize && asset.fileSize > VIDEO_MAX_BYTES) {
        Alert.alert(t("multimedia.errors.fileTooLarge", { max: "50 MB" }));
        return;
      }
      if (kind === "photo" && asset.fileSize && asset.fileSize > PHOTO_MAX_BYTES) {
        Alert.alert(t("multimedia.errors.fileTooLarge", { max: "10 MB" }));
        return;
      }

      const fd = new FormData();
      if (Platform.OS === "web") {
        const blob = await (await fetch(fileUri)).blob();
        fd.append("file", blob, fileName);
        if (posterUri) {
          const pblob = await (await fetch(posterUri)).blob();
          fd.append("poster", pblob, "poster.jpg");
        }
      } else {
        fd.append("file", { uri: fileUri, type: fileMime, name: fileName } as any);
        if (posterUri) {
          fd.append("poster", { uri: posterUri, type: "image/jpeg", name: "poster.jpg" } as any);
        }
      }
      fd.append("kind", kind);

      const apiUrl = getConfiguredApiUrl();
      const res = await fetch(`${apiUrl}/api/match-media/${matchId}`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        Alert.alert(err.error ?? t("multimedia.errors.uploadFailed"));
        return;
      }
      await qc.invalidateQueries({ queryKey: ["matchMedia", matchId] });
      await qc.invalidateQueries({ queryKey: ["matchMediaCount", matchId] });
      await qc.invalidateQueries({ queryKey: ["matchMediaFeed"] });
    } catch (e) {
      console.error("upload error", e);
      Alert.alert(t("multimedia.errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  // --- Reactions ---
  const toggleReactionMut = useMutation({
    mutationFn: async ({ mediaId, emoji }: { mediaId: string; emoji: ReactionEmoji }) => {
      const apiUrl = getConfiguredApiUrl();
      const res = await fetch(
        `${apiUrl}/api/match-media/${matchId}/${mediaId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ emoji }),
        }
      );
      if (!res.ok) throw new Error("Reaction failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matchMedia", matchId] }),
  });

  // --- Delete ---
  const deleteMut = useMutation({
    mutationFn: async (mediaId: string) => {
      const apiUrl = getConfiguredApiUrl();
      const res = await fetch(`${apiUrl}/api/match-media/${matchId}/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matchMedia", matchId] });
      qc.invalidateQueries({ queryKey: ["matchMediaCount", matchId] });
      qc.invalidateQueries({ queryKey: ["matchMediaFeed"] });
      setLightboxIndex(null);
    },
  });

  return (
    <>
      <Container variant="padded">
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <XStack justifyContent="flex-end" marginBottom="$3">
            {canUpload && (
              <Button
                size="$3"
                icon={<Plus size={16} />}
                onPress={openUpload}
                disabled={uploading}
              >
                {uploading ? t("multimedia.uploading", { percent: 0 }) : t("multimedia.upload")}
              </Button>
            )}
          </XStack>
          {items.length === 0 ? (
            <YStack alignItems="center" padding="$6">
              <Text color="$gray11">{t("multimedia.emptyMatch")}</Text>
            </YStack>
          ) : (
            <MediaGrid
              items={items}
              onItemPress={(_, i) => setLightboxIndex(i)}
            />
          )}
        </ScrollView>
      </Container>
      <MediaLightbox
        items={items}
        startIndex={lightboxIndex ?? 0}
        visible={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onToggleReaction={(item, emoji) =>
          toggleReactionMut.mutate({ mediaId: item.id, emoji })
        }
        onDelete={(item) => {
          // RN Web's Alert.alert ignores button arrays, so use window.confirm
          // on web. Native platforms get the standard destructive-style alert.
          if (Platform.OS === "web") {
            if (window.confirm(t("multimedia.deleteConfirm"))) {
              deleteMut.mutate(item.id);
            }
            return;
          }
          Alert.alert(t("multimedia.deleteConfirm"), undefined, [
            { text: t("multimedia.cancel"), style: "cancel" },
            {
              text: t("multimedia.delete"),
              style: "destructive",
              onPress: () => deleteMut.mutate(item.id),
            },
          ]);
        }}
        canDelete={canDelete}
      />
    </>
  );
}
