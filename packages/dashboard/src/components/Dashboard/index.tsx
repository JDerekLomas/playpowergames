import React, { useState } from "react";
import Header from "@components/Header";
import GamesGrid from "@components/GamesGrid";
import styles from "@components/Dashboard/Dashboard.module.css";
import { games, existingGames } from "@/data/games";
import { i18n } from "@k8-games/sdk";
import { useLanguage } from "@/contexts/LanguageContext";

const grades = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];
const ALL_TAB = "ALL";

const Dashboard: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<string>("K");
  const { currentLang, setLanguage } = useLanguage();


  const getUniqueGamesByGameName = (list: typeof games) => {
    const seen = new Set<string>();
    return list.filter((g) => {
      if (g.id === 'multiverse-algo-checker') return false;
      const gameName = g.gameName || '';
      if (seen.has(gameName) || g.disabled) return false;
      seen.add(gameName);
      return true;
    });
  };

  const filteredGames = (selectedGrade === ALL_TAB
    ? getUniqueGamesByGameName(games)
    : games.filter(
        (g) => g.grade && g.grade === selectedGrade && g.id !== 'multiverse-algo-checker'
      )
  );

  // sort filteredGames by not disabled first, then disabled
  filteredGames.sort((a, b) => {
    if (!a.disabled && b.disabled) return -1;
    if (a.disabled && !b.disabled) return 1;
    return 0;
  });

  const handleLanguageToggle = () => {
    setLanguage(currentLang === "en" ? "es" : "en");
  };

  return (
    <main className={styles.container} role="main" aria-label="Dashboard">
      <div className={styles.wrapper}>
        <Header />
        
        {/* Language Toggle */}
        <div className={styles.languageToggle}>
          <button
            onClick={handleLanguageToggle}
            className={`${styles.languageButton} ${currentLang === "en" ? styles.activeLang : ""}`}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            onClick={handleLanguageToggle}
            className={`${styles.languageButton} ${currentLang === "es" ? styles.activeLang : ""}`}
            aria-label="Switch to Spanish"
          >
            ES
          </button>
        </div>

        {/* Grade Tabs */}
        <div className={styles.gradeTabs}>
          {grades.map((grade) => (
            <button
              key={grade}
              className={`${styles.gradeTab} 
              ${selectedGrade === grade ? styles.activeTab : ""}
              ${grade == 'K'  && i18n.getLanguage() == 'es' ? styles.kGradeTab : ''}`}
              onClick={() => setSelectedGrade(grade)}
              aria-selected={selectedGrade === grade}
              role="tab"
            >
              {grade === 'K' ? i18n.t('gradeK') : `${i18n.t('grade')} ${grade}`}
            </button>
          ))}
          <button
            key={ALL_TAB}
            className={`${styles.gradeTab} ${selectedGrade === ALL_TAB ? styles.activeTab : ""}`}
            onClick={() => setSelectedGrade(ALL_TAB)}
            aria-selected={selectedGrade === ALL_TAB}
            role="tab"
          >
            {i18n.t('allGames')}
          </button>
        </div>

        <section>
          <GamesGrid
            games={filteredGames}
            onGameClick={(path) => window.open(path, "_blank")}
            isExistingGame={false}
            hideDetails={selectedGrade === ALL_TAB}
          />
        </section>
        {selectedGrade === ALL_TAB && (
          <section>
            <h2 className={styles.existingGamesTitle}>{i18n.t('existingGames')}</h2>
            <GamesGrid
              games={existingGames}
              onGameClick={(path) => window.open(path, "_blank")}
              isExistingGame={true}
            />
          </section>
        )}
      </div>
    </main>
  );
};

export default Dashboard;
