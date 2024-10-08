/**
 * @file SceneHistory.tsx
 * @desc This file defines the SceneHistory component. SceneHistory retrieves all scenes from the user's history.
 * Each scene is displayed as a card with a preview image and name. The user can click on a card to view the scene.
 * Employs pagination to display a limited number of scenes per page.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Button,
  Pagination,
  Select,
  Alert,
  Text,
  Group,
  Title,
  Image,
  LoadingOverlay,
} from "@mantine/core";
import { useAuthFetchRetry } from "../../Fetch/Retry";
import {
  fetchUserSceneHistory,
  fetchSceneName,
  fetchSceneThumbnail,
} from "../../Fetch/CommonApiCalls";
import styles from "./SceneHistory.module.css";

type Preview = {
  image: string;
  name: string;
};

type PreviewsState = {
  [uuid: string]: Preview | null;
};

const SceneHistory: React.FC = () => {
  // Scene History State
  const [sceneIds, setSceneIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<PreviewsState>({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [scenesPerPage, setScenesPerPage] = useState(10);

  // Loading/Error State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Functions
  const authRetryFetchHistory = useAuthFetchRetry(fetchUserSceneHistory);
  const authRetryFetchSceneName = useAuthFetchRetry(fetchSceneName);
  const authRetryFetchThumbnail = useAuthFetchRetry(fetchSceneThumbnail);
  const navigate = useNavigate();

  // Fetch list of scene IDs from backend
  const handleSceneHistory = useCallback(async () => {
    const userSceneHistory = await authRetryFetchHistory();
    if (userSceneHistory !== null) {
      setSceneIds(userSceneHistory.resources);
    } else {
      setError("Failed to fetch user history. Please try again later.");
    }
    setIsLoading(false);
  }, [authRetryFetchHistory]);

  useEffect(() => {
    handleSceneHistory();
  }, [handleSceneHistory]);

  // Fetch name and thumbnail for a single scene
  const handlePreview = useCallback(
    async (sceneID: string) => {
      if (previews[sceneID] !== undefined) return;

      const sceneName = await authRetryFetchSceneName(sceneID);
      if (sceneName !== null) {
        setPreviews((prev) => ({
          ...prev,
          [sceneID]: { image: "", name: sceneName.name },
        }));
      }

      const thumbnail = await authRetryFetchThumbnail(sceneID);
      if (thumbnail !== null) {
        setPreviews((prev) => ({
          ...prev,
          [sceneID]: {
            image: URL.createObjectURL(thumbnail),
            name: sceneName ? sceneName.name : "Unknown",
          },
        }));
      } else {
        setPreviews((prev) => ({ ...prev, [sceneID]: null }));
      }
    },
    [authRetryFetchSceneName, authRetryFetchThumbnail, previews]
  );

  // Fetch previews for all scenes on the current page
  useEffect(() => {
    const startIndex = (currentPage - 1) * scenesPerPage;
    const endIndex = startIndex + scenesPerPage;
    const currentPageIds = sceneIds.slice(startIndex, endIndex);

    currentPageIds.forEach((uuid) => {
      if (previews[uuid] === undefined) {
        handlePreview(uuid);
      }
    });
  }, [sceneIds, currentPage, scenesPerPage, handlePreview, previews]);

  // Page size and current page
  const totalPages = Math.ceil(sceneIds.length / scenesPerPage);
  const currentScenes = sceneIds.slice(
    (currentPage - 1) * scenesPerPage,
    currentPage * scenesPerPage
  );

  const handlePreviewClick = (sceneID: string, name: string) => {
    navigate(`/Scene/?scene_id=${sceneID}&name=${name}`);
  };

  if (isLoading) {
    return (
      <Container size="xl">
        <LoadingOverlay
          visible={true}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
      </Container>
    );
  }

  return (
    <Container size="xl" className={styles.container}>
      <div className={styles.header}>
        <Title order={2}>Your Scenes</Title>
        <Button onClick={() => navigate("/Home")}>Create New Scene</Button>
      </div>

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      {sceneIds.length > 0 ? (
        <>
          <Group gap="sm" mb="md">
            <Select
              label="Scenes per page"
              value={scenesPerPage.toString()}
              onChange={(value) => {
                setScenesPerPage(Number(value));
                setCurrentPage(1);
              }}
              data={["5", "10", "20", "35", "50"]}
              style={{ width: 100 }}
            />
            <Pagination
              total={totalPages}
              onChange={setCurrentPage}
              className={styles.pagination}
            />
          </Group>

          <div className={styles.grid}>
            {currentScenes.map((uuid) => (
              <div key={uuid} className={styles.cardWrapper}>
                <Card
                  shadow="sm"
                  p="lg"
                  radius="md"
                  withBorder
                  onClick={() =>
                    previews[uuid] &&
                    handlePreviewClick(uuid, previews[uuid]!.name)
                  }
                  className={styles.card}
                >
                  {previews[uuid] === undefined ? (
                    <Text>Loading...</Text>
                  ) : previews[uuid] === null ? (
                    <Text>Failed to load preview</Text>
                  ) : (
                    <>
                      <Card.Section>
                        <Image
                          src={previews[uuid]!.image}
                          className={styles.cardImage}
                          alt={previews[uuid]!.name}
                        />
                      </Card.Section>
                      <div className={styles.cardContent}>
                        <Text className={styles.cardTitle}>
                          {previews[uuid]!.name}
                        </Text>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Alert color="blue">No completed scenes found in your history.</Alert>
      )}
    </Container>
  );
};

export default SceneHistory;
