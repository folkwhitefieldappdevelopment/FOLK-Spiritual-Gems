import { Loader2 } from 'lucide-react';
import { sample } from '../utils/sample';

const PRABHUPADA_QUOTES = [
  "Preaching is our life.",
  "Preaching is our only business.",
  "Preaching is our real business.",
  "Preaching must be fight.",
  "So preaching is always difficult.",
  "Because people are ignorant, we have to enlighten them. That is preaching.",
  "Our only preaching is that \"Don't forget Kṛṣṇa.\"",
  "But preaching is our most important business.",
  "Those who are in the preaching work, they are very much recognized by Kṛṣṇa.",
  "Nobody is dearer than him, one who is preaching.",
  "If you yourself remain always pure, then your preaching will have effect.",
  "Travel, here and there, holding kīrtana, distributing prasādam and books.",
  "People are suffering for want of Kṛṣṇa consciousness.",
  "We have to enlighten the whole human society.",
  "Every one of you become guru.",
  "Whomever you meet, speak to him about Kṛṣṇa.",
  "This movement is the greatest welfare activity.",
  "The preacher is very dear to Kṛṣṇa.",
  "One who understands Kṛṣṇa should preach.",
  "By preaching, we become strong.",
  "The best service is to assist Lord Caitanya's mission.",
  "Lord Caitanya wanted this message in every town and village.",
  "We are teaching love of God.",
  "We are not sectarian.",
  "Kṛṣṇa consciousness is meant for everyone.",
  "Our mission is to save the suffering humanity.",
  "Distribute books profusely.",
  "Book distribution is bṛhat mṛdaṅga.",
  "We must be ready to implant Kṛṣṇa consciousness ideas throughout the whole world.",
  "Unless you preach among the fallen souls, then where is the question of preaching?",
  "The real welfare activity is Kṛṣṇa consciousness.",
  "The whole world is suffering for want of Kṛṣṇa consciousness.",
  "A preacher takes all risks for Kṛṣṇa.",
  "Preaching means compassion for the fallen souls.",
  "We have not come to exploit the world; we have come to serve it.",
  "The duty of every devotee is to preach.",
  "If you have understood Kṛṣṇa, then distribute this knowledge.",
  "This is para-upakāra, doing good to others.",
  "The saṅkīrtana movement is meant for the benefit of all living entities.",
  "Our business is to convince people about Kṛṣṇa.",
  "Simply repeat Kṛṣṇa's message without adulteration.",
  "One moon is sufficient to drive away darkness.",
  "A sincere preacher is blessed by Lord Caitanya.",
  "Preaching is the test of realization.",
  "The greatest charity is to give Kṛṣṇa consciousness.",
  "A devotee thinks how to deliver others.",
  "The more you preach, the more you become purified.",
  "Lord Caitanya's mission is to spread the holy name everywhere.",
  "Anyone can become a spiritual master by repeating Kṛṣṇa's instructions.",
  "Make your life successful and then work for the benefit of others.",
];

export const FullPageLoader = () => {
  const quote = sample(PRABHUPADA_QUOTES);
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-muted-foreground">{quote}</p>
      </div>
    </div>
  );
};
