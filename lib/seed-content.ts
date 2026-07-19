/**
 * The starter catalog is hand-written for Clue Atlas. It contains factual
 * associations, not copied game-show clues or a scraped archive. This keeps
 * the seed set safe to publish and makes provenance explicit in `sources`.
 */

export type SeedTopic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "trivia" | "studio";
  icon: string;
  accent: string;
  importanceWeight: number;
  sortOrder: number;
  isCore: boolean;
};

export type SeedQuestion = {
  id: string;
  unitId: string;
  unitSlug: string;
  topicSlug: string;
  prompt: string;
  answer: string;
  aliases: string[];
  explanation: string;
  pavlovCues: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  value: 200 | 400 | 600 | 800 | 1000;
  importance: number;
};

export const SEED_SOURCES = [
  {
    id: "source-clue-atlas-original-v1",
    title: "Clue Atlas original starter catalog",
    url: null,
    author: "Clue Atlas",
    license: "CC0-1.0",
    notes:
      "Hand-written prompts covering stable, widely documented facts. No archive or game-show clue text was scraped or copied.",
  },
  {
    id: "source-colin-davy-method",
    title: "How I Won Jeopardy With Data Science",
    url: "https://colindavy.medium.com/how-i-won-jeopardy-with-data-science-c2e9b52a1958",
    author: "Colin Davy",
    license: null,
    notes:
      "Methodology reference: prioritize recurring answers and learn their high-signal clue associations. Article text is not included in the catalog.",
  },
] as const;

export const SEED_TOPICS: readonly SeedTopic[] = [
  {
    id: "topic-world-geography",
    slug: "world-geography",
    name: "World Geography",
    description: "Capitals, rivers, borders, landmarks, and the mental map behind many clues.",
    kind: "trivia",
    icon: "🌍",
    accent: "#25A979",
    importanceWeight: 1,
    sortOrder: 10,
    isCore: true,
  },
  {
    id: "topic-us-history",
    slug: "us-history-government",
    name: "U.S. History & Government",
    description: "Presidents, founding documents, landmark events, and civic vocabulary.",
    kind: "trivia",
    icon: "🏛️",
    accent: "#4D78D4",
    importanceWeight: 1,
    sortOrder: 20,
    isCore: true,
  },
  {
    id: "topic-world-history",
    slug: "world-history",
    name: "World History",
    description: "Empires, revolutions, treaties, people, and era-defining turning points.",
    kind: "trivia",
    icon: "⌛",
    accent: "#D97B3F",
    importanceWeight: 0.95,
    sortOrder: 30,
    isCore: true,
  },
  {
    id: "topic-literature",
    slug: "literature",
    name: "Literature",
    description: "Authors, works, characters, opening lines, and literary movements.",
    kind: "trivia",
    icon: "📚",
    accent: "#8A63D2",
    importanceWeight: 1,
    sortOrder: 40,
    isCore: true,
  },
  {
    id: "topic-science",
    slug: "science-nature",
    name: "Science & Nature",
    description: "The durable principles and vocabulary of biology, chemistry, physics, and Earth science.",
    kind: "trivia",
    icon: "🔬",
    accent: "#2589BD",
    importanceWeight: 0.95,
    sortOrder: 50,
    isCore: true,
  },
  {
    id: "topic-arts",
    slug: "arts-music",
    name: "Arts & Music",
    description: "Artists, works, composers, styles, instruments, and visual signatures.",
    kind: "trivia",
    icon: "🎨",
    accent: "#D75B7D",
    importanceWeight: 0.85,
    sortOrder: 60,
    isCore: true,
  },
  {
    id: "topic-belief",
    slug: "religion-mythology",
    name: "Religion & Mythology",
    description: "Major traditions, sacred texts, figures, symbols, and classical myths.",
    kind: "trivia",
    icon: "⚡",
    accent: "#D99A27",
    importanceWeight: 0.85,
    sortOrder: 70,
    isCore: true,
  },
  {
    id: "topic-pop-culture",
    slug: "pop-culture",
    name: "Pop Culture",
    description: "Film, television, games, music, and widely shared cultural touchstones.",
    kind: "trivia",
    icon: "🎬",
    accent: "#E45F4C",
    importanceWeight: 0.7,
    sortOrder: 80,
    isCore: false,
  },
  {
    id: "topic-sports",
    slug: "sports-games",
    name: "Sports & Games",
    description: "Rules, terminology, competitions, records, and strategy across major sports.",
    kind: "trivia",
    icon: "🏆",
    accent: "#2C9C4B",
    importanceWeight: 0.55,
    sortOrder: 90,
    isCore: false,
  },
  {
    id: "topic-wordplay",
    slug: "wordplay",
    name: "Wordplay",
    description: "Roots, transformations, puns, letter patterns, and clue-solving mechanics.",
    kind: "trivia",
    icon: "🔤",
    accent: "#6D71C9",
    importanceWeight: 0.75,
    sortOrder: 100,
    isCore: false,
  },
  {
    id: "topic-data-engineering",
    slug: "data-engineering",
    name: "Data Engineering",
    description: "Pipelines, warehouses, modeling patterns, reliability, and distributed data systems.",
    kind: "studio",
    icon: "⚙️",
    accent: "#407E8F",
    importanceWeight: 0.6,
    sortOrder: 110,
    isCore: false,
  },
  {
    id: "topic-data-science",
    slug: "data-science",
    name: "Data Science",
    description: "Modeling, evaluation, feature work, experiments, and responsible inference.",
    kind: "studio",
    icon: "🧠",
    accent: "#8D5AC7",
    importanceWeight: 0.65,
    sortOrder: 120,
    isCore: false,
  },
  {
    id: "topic-statistics",
    slug: "statistics",
    name: "Statistics",
    description: "Probability, uncertainty, estimation, hypothesis tests, and robust summaries.",
    kind: "studio",
    icon: "📊",
    accent: "#C25E8B",
    importanceWeight: 0.7,
    sortOrder: 130,
    isCore: false,
  },
];

export const SEED_QUESTIONS: readonly SeedQuestion[] = [
  q("algeria-area", "world-geography", "By land area, this is Africa's largest country.", "Algeria", [], "Algeria is the largest African country by area; Sudan held that distinction before South Sudan became independent.", ["Africa", "largest by area"], 2, 400, 1),
  q("danube-budapest", "world-geography", "Budapest's Buda and Pest districts face each other across this river.", "Danube", ["Danube River"], "The Danube flows through Budapest and several other European capitals.", ["Budapest", "European capitals", "river"], 2, 400, 0.95),
  q("edo-tokyo", "world-geography", "This present-day capital of Japan was known as Edo before 1868.", "Tokyo", ["Tokyo, Japan"], "Edo was renamed Tokyo when the imperial capital moved there during the Meiji era.", ["Edo", "Japan", "capital"], 2, 400, 0.9),

  q("louisiana-purchase", "us-history-government", "The Louisiana Purchase was completed during this president's administration.", "Thomas Jefferson", ["Jefferson"], "The United States acquired the vast territory from France in 1803 while Thomas Jefferson was president.", ["Louisiana Purchase", "1803"], 2, 400, 1),
  q("federalist-papers", "us-history-government", "Hamilton, Madison, and Jay published these essays supporting ratification of the Constitution.", "The Federalist Papers", ["Federalist Papers", "The Federalist"], "The 85 essays appeared under the shared pen name Publius.", ["Hamilton", "Madison", "Jay", "Publius"], 2, 400, 1),
  q("cleveland-numbering", "us-history-government", "He is numbered both the 22nd and 24th U.S. president because his terms were nonconsecutive.", "Grover Cleveland", ["Cleveland"], "Grover Cleveland served from 1885–1889 and again from 1893–1897.", ["22nd and 24th", "nonconsecutive terms"], 2, 400, 0.9),

  q("rosetta-stone", "world-history", "Greek, Demotic, and Egyptian hieroglyphs appear together on this artifact found in 1799.", "Rosetta Stone", ["The Rosetta Stone"], "The parallel texts helped scholars decipher Egyptian hieroglyphs.", ["three scripts", "decipher hieroglyphs", "1799"], 2, 400, 1),
  q("magna-carta", "world-history", "King John affixed his seal to this charter at Runnymede in 1215.", "Magna Carta", ["The Magna Carta"], "Magna Carta became an enduring symbol of limits on royal power.", ["King John", "Runnymede", "1215"], 2, 400, 1),
  q("meiji-restoration", "world-history", "This 1868 political transformation restored imperial rule in Japan and accelerated modernization.", "Meiji Restoration", ["The Meiji Restoration"], "The Meiji Restoration ended Tokugawa shogunate rule and began a period of rapid institutional change.", ["1868", "Japan", "imperial restoration"], 3, 600, 0.9),

  q("moby-dick", "literature", "The narrator Ishmael gives his name in the famous opening of this Melville novel.", "Moby-Dick", ["Moby Dick", "Moby-Dick; or, The Whale"], "Herman Melville's novel follows Captain Ahab's pursuit of a white whale.", ["Ishmael", "Ahab", "white whale"], 1, 200, 1),
  q("nineteen-eighty-four", "literature", "Big Brother and the Thought Police loom over this George Orwell novel.", "Nineteen Eighty-Four", ["1984", "Nineteen Eighty Four"], "Orwell's dystopian novel depicts the totalitarian state of Oceania.", ["Big Brother", "Thought Police", "Oceania"], 1, 200, 1),
  q("one-hundred-years", "literature", "The Buendía family anchors this Gabriel García Márquez novel set in Macondo.", "One Hundred Years of Solitude", ["Cien años de soledad"], "The multigenerational novel is a landmark of magical realism.", ["Buendía", "Macondo", "magical realism"], 3, 600, 0.9),

  q("sodium-na", "science-nature", "Its chemical symbol Na comes from the Latin name natrium.", "Sodium", ["Na"], "Sodium is element 11; its English name and symbol come from different linguistic roots.", ["Na", "natrium", "element 11"], 1, 200, 0.9),
  q("mitochondria", "science-nature", "Most aerobic ATP production in a eukaryotic cell occurs in these organelles.", "Mitochondria", ["Mitochondrion", "The mitochondria"], "Mitochondria host the citric acid cycle and oxidative phosphorylation.", ["ATP", "cellular respiration", "organelle"], 2, 400, 1),
  q("doppler-effect", "science-nature", "A passing siren changes perceived pitch because of this effect.", "Doppler effect", ["The Doppler effect", "Doppler shift"], "Relative motion compresses or stretches successive wavefronts, changing observed frequency.", ["moving source", "pitch", "frequency shift"], 2, 400, 0.95),

  q("guernica", "arts-music", "Picasso painted this monumental antiwar work after the bombing of a Basque town.", "Guernica", [], "The black, white, and gray painting was created for the 1937 Paris International Exposition.", ["Picasso", "Basque town", "antiwar"], 2, 400, 1),
  q("four-seasons", "arts-music", "Spring, Summer, Autumn, and Winter make up this Vivaldi violin-concerto set.", "The Four Seasons", ["Four Seasons", "Le quattro stagioni"], "Vivaldi published the four concertos as part of Opus 8.", ["Vivaldi", "four violin concertos"], 1, 200, 1),
  q("water-lilies", "arts-music", "The garden at Giverny supplied the subject for this Monet series of pond paintings.", "Water Lilies", ["The Water Lilies", "Nymphéas"], "Claude Monet returned to the water-lily pond in hundreds of works over several decades.", ["Monet", "Giverny", "pond"], 2, 400, 0.9),

  q("thor", "religion-mythology", "Mjölnir is the hammer carried by this Norse god of thunder.", "Thor", [], "Thor is associated with thunder, strength, protection, and the hammer Mjölnir.", ["Mjölnir", "Norse", "thunder"], 1, 200, 1),
  q("solomon", "religion-mythology", "Proverbial wisdom and a judgment involving two mothers are associated with this biblical king.", "Solomon", ["King Solomon"], "Solomon, son of David, is traditionally remembered for wisdom and for building the First Temple.", ["wise king", "son of David", "First Temple"], 2, 400, 1),
  q("ganesha", "religion-mythology", "This elephant-headed Hindu deity is widely invoked as a remover of obstacles.", "Ganesha", ["Ganesh", "Ganapati"], "Ganesha is among the most widely recognized and worshipped Hindu deities.", ["elephant head", "remover of obstacles"], 2, 400, 0.9),

  q("rosebud", "pop-culture", "The final word 'Rosebud' drives the mystery at the center of this film.", "Citizen Kane", [], "The 1941 film traces a reporter's attempt to understand newspaper magnate Charles Foster Kane.", ["Rosebud", "Charles Foster Kane"], 1, 200, 1),
  q("luigi", "pop-culture", "This green-clad character is Mario's brother in Nintendo games.", "Luigi", [], "Luigi debuted shortly after Mario and became the second player character in the Mario Bros. arcade game.", ["Mario's brother", "green", "Nintendo"], 1, 200, 0.8),
  q("black-panther", "pop-culture", "T'Challa rules the fictional nation of Wakanda as this superhero.", "Black Panther", ["The Black Panther"], "T'Challa is one of several Marvel characters to hold the Black Panther mantle.", ["T'Challa", "Wakanda"], 1, 200, 0.8),

  q("tennis-love", "sports-games", "In this sport's scoring vocabulary, 'love' means zero.", "Tennis", [], "The exact origin of the term is debated, but love consistently denotes a score of zero in tennis.", ["love", "zero", "scoring"], 1, 200, 1),
  q("tour-de-france", "sports-games", "Riders compete for the yellow jersey in this multi-stage cycling race.", "Tour de France", ["The Tour de France", "Le Tour"], "The overall race leader wears the maillot jaune, or yellow jersey.", ["yellow jersey", "cycling", "stage race"], 1, 200, 1),
  q("hat-trick", "sports-games", "Three goals by one player in a game are commonly called this.", "Hat trick", ["A hat trick", "Hat-trick"], "The phrase is used most famously in hockey and association football, among other sports.", ["three goals", "one player"], 1, 200, 0.85),

  q("anagram", "wordplay", "Rearrange every letter of one word or phrase to make another, and you have this.", "Anagram", ["An anagram"], "Anagrams reuse all original letters with the same multiplicities.", ["rearrange letters"], 1, 200, 1),
  q("palindrome", "wordplay", "'Never odd or even' illustrates this type of text that reads the same in reverse when spacing is ignored.", "Palindrome", ["A palindrome"], "A palindrome has the same character sequence forward and backward after agreed normalization.", ["same backward", "reverse"], 1, 200, 1),
  q("portmanteau", "wordplay", "'Brunch,' blending breakfast and lunch, is this kind of combined word.", "Portmanteau", ["A portmanteau", "Portmanteau word", "Blend word"], "A portmanteau combines both sound and meaning from two or more words.", ["blend", "combined word"], 1, 200, 0.9),

  q("idempotence", "data-engineering", "A pipeline operation that can run repeatedly with the same final result has this property.", "Idempotence", ["Idempotency", "Idempotent"], "Idempotent loads make retries safer because replaying an operation does not duplicate its intended effect.", ["safe retries", "same result", "pipeline"], 2, 400, 1),
  q("scd-type-two", "data-engineering", "This dimensional-modeling pattern preserves history by adding a new row when tracked attributes change.", "Slowly changing dimension Type 2", ["SCD Type 2", "SCD2", "Type 2 slowly changing dimension"], "SCD Type 2 typically uses effective dates or current-row flags to preserve attribute history.", ["preserve history", "new row", "effective dates"], 3, 600, 0.95),
  q("change-data-capture", "data-engineering", "Often abbreviated CDC, this technique records inserts, updates, and deletes from a source system.", "Change data capture", ["CDC"], "Change data capture propagates row-level changes without repeatedly copying an entire source table.", ["CDC", "inserts updates deletes"], 2, 400, 1),

  q("overfitting", "data-science", "A model that excels on training data but fails to generalize is showing this problem.", "Overfitting", ["Overfit"], "Overfitting occurs when a model learns noise or overly specific patterns instead of generalizable signal.", ["training performance", "poor generalization"], 1, 200, 1),
  q("cross-validation", "data-science", "This resampling method rotates held-out folds to estimate model performance.", "Cross-validation", ["Cross validation", "K-fold cross-validation", "K fold cross validation"], "K-fold cross-validation trains and evaluates across multiple partitions to reduce dependence on one split.", ["held-out folds", "model evaluation"], 2, 400, 1),
  q("feature-engineering", "data-science", "Creating useful model inputs from raw variables is known by this two-word term.", "Feature engineering", [], "Feature engineering uses domain knowledge and transformations to expose learnable signal.", ["model inputs", "raw variables"], 1, 200, 0.9),

  q("p-value", "statistics", "Under a null model, this is the probability of a result at least as extreme as the observed one.", "P-value", ["P value", "The p-value"], "A p-value is not the probability that the null hypothesis is true; it is computed assuming the null model.", ["null hypothesis", "at least as extreme"], 2, 400, 1),
  q("median-robust", "statistics", "Compared with the mean, this middle-value statistic is usually more resistant to extreme outliers.", "Median", ["The median"], "A few extremely large or small observations can move a mean substantially while leaving the median nearly unchanged.", ["middle value", "robust", "outliers"], 1, 200, 1),
  q("bayes-theorem", "statistics", "This theorem updates a prior probability using evidence through a likelihood.", "Bayes' theorem", ["Bayes theorem", "Bayes's theorem", "Bayes rule"], "Bayes' theorem expresses posterior probability as proportional to likelihood times prior probability.", ["prior", "likelihood", "posterior"], 2, 400, 1),
];

export const SEED_ACHIEVEMENTS = [
  { id: "achievement-first-clue", slug: "first-clue", name: "First Clue", description: "Log your first answer.", icon: "🧭", metric: "attempts", threshold: 1, xpReward: 25 },
  { id: "achievement-ten-clues", slug: "ten-clues", name: "Clue Collector", description: "Log 10 answers.", icon: "🗂️", metric: "attempts", threshold: 10, xpReward: 50 },
  { id: "achievement-ten-correct", slug: "ten-correct", name: "On the Board", description: "Answer 10 clues correctly.", icon: "✅", metric: "correct", threshold: 10, xpReward: 60 },
  { id: "achievement-five-topics", slug: "five-topics", name: "Renaissance Mind", description: "Explore five different topics.", icon: "🌈", metric: "topics", threshold: 5, xpReward: 75 },
  { id: "achievement-three-streak", slug: "three-day-streak", name: "Hot Streak", description: "Study on three consecutive days.", icon: "🔥", metric: "streak", threshold: 3, xpReward: 75 },
  { id: "achievement-five-hundred-xp", slug: "five-hundred-xp", name: "Atlas Builder", description: "Earn 500 XP.", icon: "🏔️", metric: "xp", threshold: 500, xpReward: 100 },
] as const;

function q(
  slug: string,
  topicSlug: string,
  prompt: string,
  answer: string,
  aliases: string[],
  explanation: string,
  pavlovCues: string[],
  difficulty: SeedQuestion["difficulty"],
  value: SeedQuestion["value"],
  importance: number,
): SeedQuestion {
  return {
    id: `question-${slug}`,
    unitId: `unit-${slug}`,
    unitSlug: slug,
    topicSlug,
    prompt,
    answer,
    aliases,
    explanation,
    pavlovCues,
    difficulty,
    value,
    importance,
  };
}
