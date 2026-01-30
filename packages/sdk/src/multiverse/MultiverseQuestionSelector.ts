import { mathFactTags, parseMathFact } from "./config";
import mathFacts from "./math_facts.json";
import decimalFacts from "./decimal_fluency.json";
import operationGroups from "./operation_groups.json";

export interface MathFact {
  id?: string;
  "question text": string;
  "intrinsic difficulty": number;
  tags: string[];
}

export type MathFactTagKey = keyof typeof mathFactTags;

export interface EligibleFactGroupMeta {
  key: MathFactTagKey;
  title: string;
}

export interface TrialAttempt {
  trailNo: number;
  isCorrect: boolean;
}

export interface FactMasteryItem {
  id: string;
  mathFact: MathFact;
  isFluent: boolean;
  trials: TrialAttempt[];
  isAssessedForFluency: boolean;
}

export interface StudentState {
  factMastery: FactMasteryItem[];
  eligibleFactGroups: EligibleFactGroupMeta[];
}

export interface StudentResponse {
  mathFact: MathFact;
  responseTime: number; // milliseconds
  correct: boolean;
  createTime: string; // ISO string
}

export class MultiverseQuestionSelector {
  public readonly studentState: StudentState;
  private currentFactGroupKey: MathFactTagKey | null = null;
  private consecutiveCorrect: number = 0;
  private seenQuestions: MathFact[] = [];
  private currentQuizGroupIndex: number = 0;
  private nonFluentFacts: FactMasteryItem[] = [];
  private seenFactGroupKeys: Set<MathFactTagKey> = new Set();
  private readonly SESSION_STORAGE_KEY = "studentData";

  /**
   * Initializes the MultiverseQuestionSelector with fact groups and student state
   * @param requestedFactGroupKeys Optional array of fact group keys to include. If not provided, defaults to first 5 groups
   */
  constructor(requestedFactGroupKeys?: Array<MathFactTagKey | string>) {
    let eligibleFactGroups: EligibleFactGroupMeta[] = [];
    if (requestedFactGroupKeys) {
      const validRequestedKeys = requestedFactGroupKeys.filter(key => key in mathFactTags) as MathFactTagKey[];
      if (validRequestedKeys.length > 0) {
        const selectedKeys: MathFactTagKey[] = validRequestedKeys;
        eligibleFactGroups = selectedKeys.map(
          (key) => ({ key, title: mathFactTags[key] })
        );

      } else {
        const defaultKeys = Object.entries(mathFactTags)
          .slice(0, 5)
          .map(([key]) => key);
        const selectedKeys: MathFactTagKey[] = defaultKeys as MathFactTagKey[];
        eligibleFactGroups = selectedKeys.map(
          (key) => ({ key, title: mathFactTags[key] })
        );
      }
    }

    const mathFactsArray = (mathFacts as unknown as MathFact[]) ?? [];
    const decimalFactsArray = (decimalFacts as unknown as MathFact[]) ?? [];
    const operationGroupsArray = (operationGroups as unknown as MathFact[]) ?? [];
    const groupTitles = new Set(eligibleFactGroups.map((g) => g.title));
    const allMathFactsInEligibleGroups: MathFact[] = [...mathFactsArray, ...decimalFactsArray, ...operationGroupsArray].filter((fact) =>
      fact.tags.some((tag) => groupTitles.has(tag))
    );

    const factMasteryMap = new Map<string, FactMasteryItem>();
    for (const fact of allMathFactsInEligibleGroups) {
      const { id } = fact;
      if (id && !factMasteryMap.has(id)) {
        factMasteryMap.set(id, {
          id,
          mathFact: fact,
          isFluent: false,
          trials: [],
          isAssessedForFluency: false,
        });
      }
    }

    const factMastery = Array.from(factMasteryMap.values());

    // Merge with any existing session-stored situdent data (fact mastery only)
    const storedState = this.loadStudentState();
    let mergedFactMastery = factMastery;

    if (storedState?.factMastery) {
      const storedById = new Map<string, FactMasteryItem>();
      for (const item of storedState.factMastery) {
        if (item && item.id) storedById.set(item.id, item);
      }

      mergedFactMastery = factMastery.map((current) => {
        const storedItem = storedById.get(current.id);
        if (!storedItem) return current;
        return {
          ...current,
          // Merge progress fields from stored state
          isFluent: Boolean(storedItem.isFluent),
          trials: Array.isArray(storedItem.trials) ? storedItem.trials : [],
          isAssessedForFluency: Boolean(storedItem.isAssessedForFluency),
        } as FactMasteryItem;
      });
    }

    this.studentState = {
      factMastery: mergedFactMastery,
      eligibleFactGroups,
    };

    // Initialize current fact group randomly from eligible groups
    if (this.studentState.eligibleFactGroups.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.studentState.eligibleFactGroups.length);
      this.currentFactGroupKey = this.studentState.eligibleFactGroups[randomIndex].key;
      this.seenFactGroupKeys.add(this.currentFactGroupKey);
    } else {
      this.currentFactGroupKey = null;
    }
    this.consecutiveCorrect = 0;
    this.seenQuestions = [];
    this.currentQuizGroupIndex = 0;

    // Persist initialized state to session storage for cross-game sharing
    this.saveStudentState();

    // Initialize non-fluent facts array for prioritizing weak areas
    this.nonFluentFacts = this.getNonFluentFacts();
    console.log("nonFluentFacts: ", this.nonFluentFacts.map(f => f.mathFact["question text"]));
  }

  /**
   * Saves the current student state to session storage for persistence across games
   * @private
   */
  private saveStudentState(): void {
    try {
      // Add environment check like your commented code
      const storage: any =
        typeof globalThis !== "undefined" && (globalThis as any).sessionStorage
          ? (globalThis as any).sessionStorage
          : undefined;

      if (storage) {
        const dataToStore = JSON.stringify(this.studentState);
        storage.setItem(this.SESSION_STORAGE_KEY, dataToStore);
        // console.log('Saved to sessionStorage:', dataToStore); // Debug log
      } else {
        console.warn('sessionStorage not available');
      }
    } catch (error) {
      console.error('Failed to save student state to sessionStorage:', error);
    }
  }

  /**
   * Loads student state from session storage if available
   * @private
   * @returns Partial student state from session storage, or null if not available
   */
  private loadStudentState(): Partial<StudentState> | null {
    try {
      const storage: any =
        typeof globalThis !== "undefined" && (globalThis as any).sessionStorage
          ? (globalThis as any).sessionStorage
          : undefined;

      if (storage) {
        const raw = storage.getItem(this.SESSION_STORAGE_KEY);
        if (raw) {
          console.log("Loaded studentData from sessionStorage:");
          return JSON.parse(raw) as Partial<StudentState>;
        }
      }
    } catch (error) {
      console.warn('Failed to load student state from sessionStorage:', error);
    }
    return null;
  }

  /**
   * Updates the eligible fact groups and resets progression state
   * @param requestedFactGroupKeys Array of fact group keys to set as eligible
   */
  public updateEligibleFactGroup(requestedFactGroupKeys: Array<MathFactTagKey | string>): void {
    const uniqueRequestedKeys = Array.from(
      new Set((requestedFactGroupKeys ?? []).map((key) => String(key)))
    );

    const validRequestedKeys: MathFactTagKey[] = uniqueRequestedKeys.filter(
      (key): key is MathFactTagKey => key in mathFactTags
    ) as MathFactTagKey[];

    const updatedEligibleGroups: EligibleFactGroupMeta[] = validRequestedKeys.map(
      (key) => ({ key, title: mathFactTags[key] })
    );

    this.studentState.eligibleFactGroups = updatedEligibleGroups;

    if (updatedEligibleGroups.length === 0) {
      return;
    }

    const groupTitles = new Set(updatedEligibleGroups.map((g) => g.title));
    const mathFactsArray = (mathFacts as unknown as MathFact[]) ?? [];
    const decimalFactsArray = (decimalFacts as unknown as MathFact[]) ?? [];
    const operationGroupsArray = (operationGroups as unknown as MathFact[]) ?? [];
    const factsArray = [...mathFactsArray, ...decimalFactsArray, ...operationGroupsArray].filter((fact) =>
      fact.tags.some((tag) => groupTitles.has(tag))
    );

    const candidateFacts = factsArray.filter((fact) =>
      fact.tags.some((tag) => groupTitles.has(tag))
    );

    const existingIds = new Set(this.studentState.factMastery.map((fm) => fm.id));

    for (const fact of candidateFacts) {
      const { id } = fact;
      if (id && !existingIds.has(id)) {
        this.studentState.factMastery.push({
          id,
          mathFact: fact,
          isFluent: false,
          trials: [],
          isAssessedForFluency: false,
        });
      }
    }

    // Reset progression state when eligible groups change
    this.seenFactGroupKeys.clear();
    if (this.studentState.eligibleFactGroups.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.studentState.eligibleFactGroups.length);
      this.currentFactGroupKey = this.studentState.eligibleFactGroups[randomIndex].key;
      this.seenFactGroupKeys.add(this.currentFactGroupKey);
    } else {
      this.currentFactGroupKey = null;
    }
    this.consecutiveCorrect = 0;
    this.seenQuestions = [];
    this.currentQuizGroupIndex = 0;

    // Persist updated state after changing eligible groups
    this.saveStudentState();

    // Update non-fluent facts array based on new eligible groups
    this.nonFluentFacts = this.getNonFluentFacts();
  }

  /**
   * Creates a student response object from the given parameters
   * @param mathFact The math fact that was answered
   * @param responseTime Time taken to respond in milliseconds
   * @param correct Whether the answer was correct
   * @returns StudentResponse object with the provided data and current timestamp
   */
  public createStudentResponse(
    mathFact: MathFact,
    responseTime: number,
    correct: boolean
  ) {
    const response: StudentResponse = {
      mathFact,
      responseTime,
      correct,
      createTime: new Date().toISOString(),
    };
    return response;
  }

  /**
   * Processes a student response and updates mastery tracking and progression state
   * @param lastStudentResponse The student's response to process
   * @private
   */
  private processStudentResponse(lastStudentResponse: StudentResponse): void {
    const responseFact = lastStudentResponse.mathFact;
    const { id } = responseFact;

    let mastery = this.studentState.factMastery.find((fm) => fm.id === id);
    if (mastery) {
      mastery.trials.push({
        trailNo: mastery.trials.length + 1,
        isCorrect: lastStudentResponse.correct,
      });
      mastery.isAssessedForFluency = true;

      const correctCount = mastery.trials.reduce(
        (sum, t) => sum + (t.isCorrect ? 1 : 0),
        0
      );
      if (correctCount >= 3) {
        mastery.isFluent = true;
      }
    } else {
      console.log("responseFact not found in studentState.factMastery: ", responseFact["question text"]);
    }

    // Progression tracking: update consecutive correct and move to next group if needed
    if (lastStudentResponse.correct) {
      this.consecutiveCorrect += 1;
    } else {
      this.consecutiveCorrect = 0;
    }

    if (this.consecutiveCorrect >= 3) {
      // Move to next optimal group based on smart selection logic
      this.moveToNextOptimalGroup();
      // Reset on group change or completion of cycle
      this.consecutiveCorrect = 0;
    }

    // Persist updated mastery and progression
    this.saveStudentState();
  }

  /**
   * Gets non-fluent facts that have at least one incorrect attempt and are from eligible fact groups
   * @private
   * @returns Array of FactMasteryItem that are not fluent and have incorrect attempts
   */
  private getNonFluentFacts(): FactMasteryItem[] {
    const groupTitles = new Set(this.studentState.eligibleFactGroups.map((g) => g.title));
    
    return this.studentState.factMastery.filter(fm => {
      // Must be from eligible fact groups
      const isInEligibleGroup = fm.mathFact.tags.some(tag => groupTitles.has(tag));
      if (!isInEligibleGroup) return false;
      
      // Must not be fluent
      if (fm.isFluent) return false;
      
      // Must have at least one trial and the last attempt must be incorrect
      if (fm.trials.length === 0) return false;
      const lastAttemptWasIncorrect = fm.trials[fm.trials.length - 1].isCorrect === false;
      return lastAttemptWasIncorrect;
    });
  }

  /**
   * Gets the group with the most unattempted questions from the provided groups
   * @private
   * @param groups Array of eligible fact group metadata to choose from
   * @returns The key of the group with the most unattempted questions, or random if tie/all attempted
   */
  private getGroupWithMostUnattemptedQuestions(groups: EligibleFactGroupMeta[]): MathFactTagKey {
    const groupCounts = groups.map(group => {
      const unattemptedCount = this.studentState.factMastery
        .filter(fm => fm.mathFact.tags.includes(group.title) && fm.trials.length === 0)
        .length;
      return { group, unattemptedCount };
    });

    // Find the maximum unattempted count
    const maxCount = Math.max(...groupCounts.map(gc => gc.unattemptedCount));
    
    // Get all groups that have the maximum count
    const groupsWithMaxCount = groupCounts.filter(gc => gc.unattemptedCount === maxCount);
    
    // If there's a tie or all groups have 0 unattempted questions, pick randomly
    const randomIndex = Math.floor(Math.random() * groupsWithMaxCount.length);
    return groupsWithMaxCount[randomIndex].group.key;
  }

  /**
   * Moves to the next optimal fact group based on seen groups and unattempted questions
   * @private
   * @returns true if successfully moved to a new group, false if no groups available
   */
  private moveToNextOptimalGroup(): boolean {
    const groups = this.studentState.eligibleFactGroups;
    if (groups.length === 0 || !this.currentFactGroupKey) {
      return false;
    }

    // Get unseen groups (exclude current and already seen groups)
    const unseenGroups = groups.filter(g => 
      g.key !== this.currentFactGroupKey && !this.seenFactGroupKeys.has(g.key)
    );
    
    let nextKey: MathFactTagKey | null = null;
    
    if (unseenGroups.length > 0) {
      // Pick group with most unattempted questions from unseen groups
      nextKey = this.getGroupWithMostUnattemptedQuestions(unseenGroups);
    } else {
      // All groups are seen, pick group with most unattempted questions (but not current)
      const otherGroups = groups.filter(g => g.key !== this.currentFactGroupKey);
      if (otherGroups.length > 0) {
        nextKey = this.getGroupWithMostUnattemptedQuestions(otherGroups);
        // Reset seen groups when we've cycled through all
        this.seenFactGroupKeys.clear();
      }
    }
    
    if (nextKey) {
      this.currentFactGroupKey = nextKey;
      this.seenFactGroupKeys.add(nextKey);
      return true;
    }
    
    return false;
  }

  /**
   * Gets the next question based on current state and optional last response
   * Uses priority scoring and alternating high/low difficulty pattern (HHLLHHLL...)
   * @param lastStudentResponse Optional previous response to process before selecting next question
   * @returns Next MathFact to present, or null if no questions available
   */
  public getNextQuestion(lastStudentResponse?: StudentResponse, filter?: (fm: FactMasteryItem) => boolean): MathFact | null {
    if (lastStudentResponse) this.processStudentResponse(lastStudentResponse);

    // Prioritize non-fluent facts with incorrect attempts before general algorithm
    const nonFluentFacts = filter ? this.nonFluentFacts.filter(filter) : this.nonFluentFacts;
    if (nonFluentFacts.length > 0) {
      const nonFluentFact = nonFluentFacts.pop()!;
      // Remove fact from nonFluentFacts
      this.nonFluentFacts = this.nonFluentFacts.filter(fm => fm.id !== nonFluentFact.id);
      this.seenQuestions.push(nonFluentFact.mathFact);
      return nonFluentFact.mathFact;
    }

    const groupTitles = new Set(this.studentState.eligibleFactGroups.map((g) => g.title));
    if (groupTitles.size === 0 || !this.currentFactGroupKey) {
      return null;
    }

    // Determine current group's title and gather facts within it
    const currentGroupTitle = this.studentState.eligibleFactGroups.find(
      (g) => g.key === this.currentFactGroupKey
    )?.title;
    if (!currentGroupTitle) {
      return null;
    }

    // Get facts from current group, prioritizing unattempted questions
    let masteryItemsInGroup = this.studentState.factMastery.filter((fm) =>
      fm.mathFact.tags.includes(currentGroupTitle) && fm.trials.length === 0
    );

    if (filter) {
      masteryItemsInGroup = masteryItemsInGroup.filter(filter);
    }

    // If no unattempted questions in current group, fall back to all questions in group
    if (masteryItemsInGroup.length === 0) {
      masteryItemsInGroup = this.studentState.factMastery.filter((fm) =>
        fm.mathFact.tags.includes(currentGroupTitle)
      );
    }

    if (filter) {
      masteryItemsInGroup = masteryItemsInGroup.filter(filter);
    }

    if (masteryItemsInGroup.length === 0) {
      // If filter eliminated all questions, try moving to next optimal group
      if (this.moveToNextOptimalGroup()) {
        // Recursively try again with the new group
        return this.getNextQuestion(undefined, filter);
      }
      return null;
    }

    // Compute priority scores
    const scored = masteryItemsInGroup.map((fm) => {
      const total = fm.trials.length;
      const correct = fm.trials.reduce((sum, t) => sum + (t.isCorrect ? 1 : 0), 0);
      const accuracy = total > 0 ? correct / total : 0;
      const priority = (1 - accuracy) * fm.mathFact["intrinsic difficulty"];
      return { fm, priority };
    });

    // Partition into high/low based on median split
    const sorted = [...scored].sort((a, b) => b.priority - a.priority);
    const mid = Math.ceil(sorted.length / 2);
    const high = sorted.slice(0, mid).map((s) => s.fm);
    const low = sorted.slice(mid).map((s) => s.fm);

    // Determine whether to serve high or low next: pattern HHLLHHLL...
    const seenInCurrentGroup = this.seenQuestions.filter((q) => q.tags.includes(currentGroupTitle));
    const step = seenInCurrentGroup.length % 4;
    const serveHigh = step === 0 || step === 1;

    const pool = serveHigh ? high : low;
    if (pool.length === 0) {
      // Fallback to the other pool or any
      const altPool = serveHigh ? low : high;
      if (altPool.length === 0) {
        const any = sorted[0]?.fm;
        if (!any) return null;
        this.seenQuestions.push(any.mathFact);
        return any.mathFact;
      }
      const chosenAlt = altPool[0];
      this.seenQuestions.push(chosenAlt.mathFact);
      return chosenAlt.mathFact;
    }

    // Avoid immediate repeat if possible
    const lastSeen = seenInCurrentGroup[seenInCurrentGroup.length - 1]?.id;
    const candidate = pool.find((fm) => fm.id !== lastSeen) ?? pool[0];
    this.seenQuestions.push(candidate.mathFact);

    // Print out state
    console.log("state: ", {
      currentFactGroupKey: this.currentFactGroupKey,
      consecutiveCorrect: this.consecutiveCorrect,
      seenQuestions: this.seenQuestions.map((q) => q.id),
      studentState: this.studentState,
    });

    return candidate.mathFact;
  }

  /**
   * Gets the next quiz question by cycling through all eligible fact groups for diversity
   * @param lastStudentResponse Optional previous response to process before selecting next question
   * @returns Next MathFact to present from the next fact group in rotation, or null if no questions available
   */
  public getNextQuizQuestion(lastStudentResponse?: StudentResponse, filter?: (fm: FactMasteryItem) => boolean): MathFact | null {
    if (lastStudentResponse) this.processStudentResponse(lastStudentResponse);

    const eligibleGroups = this.studentState.eligibleFactGroups;
    if (eligibleGroups.length === 0) {
      return null;
    }

    // Check if all questions across all eligible groups have been seen to prevent infinite loop
    const groupTitles = new Set(eligibleGroups.map(g => g.title));
    let allEligibleFacts = this.studentState.factMastery.filter(fm =>
      fm.mathFact.tags.some(tag => groupTitles.has(tag))
    );
    if (filter) {
      allEligibleFacts = allEligibleFacts.filter(filter);
    }
    const seenQuestionIds = new Set(this.seenQuestions.map(q => q.id));
    const hasUnseenQuestions = allEligibleFacts.some(fm => !seenQuestionIds.has(fm.id));
    
    if (!hasUnseenQuestions) {
      // All questions have been seen, quiz is complete
      return null;
    }

    // Get current group and cycle to next group for next call
    const currentGroup = eligibleGroups[this.currentQuizGroupIndex];
    this.currentQuizGroupIndex = (this.currentQuizGroupIndex + 1) % eligibleGroups.length;
    
    // Get facts from current group
    const factsInGroup = allEligibleFacts.filter(fm =>
      fm.mathFact.tags.includes(currentGroup.title)
    );

    if (factsInGroup.length === 0) {
      // Try next group recursively if current group has no facts
      return this.getNextQuizQuestion(undefined, filter);
    }

    // Filter out questions that have already been seen
    const unseenFacts = factsInGroup.filter(fm => !seenQuestionIds.has(fm.id));
    
    if (unseenFacts.length === 0) {
      // All questions in this group have been seen, try next group recursively
      return this.getNextQuizQuestion(undefined, filter);
    }
    
    // Select a random question from unseen facts for better randomization
    const randomIndex = Math.floor(Math.random() * unseenFacts.length);
    const candidate = unseenFacts[randomIndex];
    
    // Add to seen questions for consistency with existing patterns
    this.seenQuestions.push(candidate.mathFact);
    
    return candidate.mathFact;
  }

  /**
   * Gets the next question for Level 1 add/sub flow.
   * Alternates between an addition and its corresponding subtraction pair.
   * - If last was addition a+b=c, return subtraction c-a=b (if available)
   * - If last was subtraction, return a random addition (with a valid subtraction pair)
   * When all questions are seen, it loops again by allowing repeats.
   */
  public getNextQuestionAddSub(lastStudentResponse?: StudentResponse, filter?: (fm: FactMasteryItem) => boolean): MathFact | null {
    if (lastStudentResponse) this.processStudentResponse(lastStudentResponse);

    const eligibleGroups = this.studentState.eligibleFactGroups;
    if (eligibleGroups.length === 0) {
      return null;
    }

    // 1) Gather all eligible facts (respect optional filter)
    const groupTitles = new Set(eligibleGroups.map(g => g.title));
    let allEligibleFacts = this.studentState.factMastery.filter(fm =>
      fm.mathFact.tags.some(tag => groupTitles.has(tag))
    );
    if (filter) {
      allEligibleFacts = allEligibleFacts.filter(filter);
    }

    if (allEligibleFacts.length === 0) {
      return null;
    }

    // 2) Filter out seen questions; if all are seen, loop again by allowing repeats
    const seenIds = new Set(this.seenQuestions.map(q => q.id));
    let workingSet = allEligibleFacts.filter(fm => !seenIds.has(fm.id));
    if (workingSet.length === 0) {
      workingSet = allEligibleFacts;
    }

    // 3) Create groups Addition/Subtraction ensuring each has a corresponding pair in the working set
    const byText = new Map<string, FactMasteryItem>();
    for (const fm of workingSet) {
      byText.set(fm.mathFact["question text"], fm);
    }

    const additionWithPairs: FactMasteryItem[] = [];
    const subtractionWithPairs: FactMasteryItem[] = [];

    for (const fm of workingSet) {
      const parsed = parseMathFact(fm.mathFact["question text"]);
      if (!parsed) continue;

      if (parsed.operation === '+') {
        const a = parsed.operand1;
        const b = parsed.operand2;
        const c = parsed.result;
        const subText = `${c}-${a}=${b}`;
        if (byText.has(subText)) {
          additionWithPairs.push(fm);
        }
      } else if (parsed.operation === '-') {
        const a = parsed.operand1;
        const b = parsed.operand2;
        const c = parsed.result; // a - b = c  => corresponding addition c + b = a
        const addText = `${c}+${b}=${a}`;
        if (byText.has(addText)) {
          subtractionWithPairs.push(fm);
        }
      }
    }

    // If no viable pairs exist, bail
    if (additionWithPairs.length === 0 && subtractionWithPairs.length === 0) {
      return null;
    }

    // 4) Decide next based on last seen question
    const lastSeen = this.seenQuestions[this.seenQuestions.length - 1];
    let chosen: FactMasteryItem | undefined;

    if (lastSeen) {
      const lastParsed = parseMathFact(lastSeen["question text"]);
      if (lastParsed?.operation === '+') {
        // Return the corresponding subtraction if available in the working set
        const subText = `${lastParsed.result}-${lastParsed.operand1}=${lastParsed.operand2}`;
        const pair = byText.get(subText);
        if (pair) {
          chosen = pair;
        } else if (subtractionWithPairs.length > 0) {
          // Fallback to any subtraction with a valid pair
          chosen = subtractionWithPairs[Math.floor(Math.random() * subtractionWithPairs.length)];
        } else if (additionWithPairs.length > 0) {
          chosen = additionWithPairs[Math.floor(Math.random() * additionWithPairs.length)];
        }
      } else if (lastParsed?.operation === '-') {
        // Randomly select an addition with a valid pair
        if (additionWithPairs.length > 0) {
          chosen = additionWithPairs[Math.floor(Math.random() * additionWithPairs.length)];
        } else if (subtractionWithPairs.length > 0) {
          chosen = subtractionWithPairs[Math.floor(Math.random() * subtractionWithPairs.length)];
        }
      } else {
        // Last seen isn't add/sub; prefer starting with addition
        if (additionWithPairs.length > 0) {
          chosen = additionWithPairs[Math.floor(Math.random() * additionWithPairs.length)];
        } else if (subtractionWithPairs.length > 0) {
          chosen = subtractionWithPairs[Math.floor(Math.random() * subtractionWithPairs.length)];
        }
      }
    } else {
      // First question: choose a random addition (with valid pair) if possible
      if (additionWithPairs.length > 0) {
        chosen = additionWithPairs[Math.floor(Math.random() * additionWithPairs.length)];
      } else if (subtractionWithPairs.length > 0) {
        chosen = subtractionWithPairs[Math.floor(Math.random() * subtractionWithPairs.length)];
      }
    }

    if (!chosen) {
      return null;
    }

    // 5) Track seen and return
    this.seenQuestions.push(chosen.mathFact);
    return chosen.mathFact;
  }

  /**
   * Returns all seen questions that were answered incorrectly by the student in the current session
   * @returns Array of MathFact objects that were answered incorrectly at least once
   */
  public getIncorrectlyAnsweredQuestions(): MathFact[] {
    const incorrectlyAnswered: MathFact[] = [];

    for (const mastery of this.studentState.factMastery) {
      // Check if this question has any incorrect trials
      const hasIncorrectTrials = mastery.trials.some(trial => !trial.isCorrect);

      if (hasIncorrectTrials) {
        incorrectlyAnswered.push(mastery.mathFact);
      }
    }

    // Filter to only include questions that are in the current session's seenQuestions
    const seenQuestionIds = new Set(this.seenQuestions.map(q => q.id));
    return incorrectlyAnswered.filter(question => seenQuestionIds.has(question.id));
  }

  public reset(): void {
    this.seenQuestions = [];
    this.currentFactGroupKey = this.studentState.eligibleFactGroups[0]?.key ?? null;
    this.consecutiveCorrect = 0;
    this.nonFluentFacts = []
  }
}

