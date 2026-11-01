/** A song preset for the Chord changes mode: a progression typed as chord names. */
export interface SongPreset {
  id: string;
  title: string;
  src: string;
}

/** Song presets in picker order (Creep first). */
export const SONG_PRESETS: readonly SongPreset[] = [
  { id: 'creep', title: 'Creep', src: 'G B C Cm' },
  { id: 'wishYouWereHere', title: 'Wish You Were Here', src: 'C D Am G' },
  { id: 'blowinInTheWind', title: "Blowin' in the Wind", src: 'G C D G' },
  { id: 'time', title: 'Time', src: 'F#m7 Amaj7' },
  { id: 'hitTheRoadJack', title: 'Hit the Road Jack', src: 'Am G F E' },
  { id: 'houseOfTheRisingSun', title: 'House of the Rising Sun', src: 'Am C D F Am C E' },
  { id: 'heyJude', title: 'Hey Jude', src: 'F C C F B♭ F C F' },
  { id: 'knockinOnHeavensDoor', title: "Knockin' on Heaven's Door", src: 'G D Am G D C' },
  { id: 'horseWithNoName', title: 'A Horse with No Name', src: 'Em D' },
  { id: 'wonderfulTonight', title: 'Wonderful Tonight', src: 'G D C D' },
  { id: 'jolene', title: 'Jolene', src: 'Am C G Am' },
  { id: 'wehikulCzasu', title: 'Wehikuł czasu', src: 'A E F#m D' },
  { id: 'noWomanNoCry', title: 'No Woman, No Cry', src: 'C G Am F' },
];
