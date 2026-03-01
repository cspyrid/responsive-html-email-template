# Mini Design Doc — Trivia 25ης Μαρτίου

## Παραδοχές
1. Το σχολείο τρέχει την εφαρμογή σε LAN server με Node.js 20+, χωρίς cloud εξαρτήσεις.
2. Αποθηκεύονται μόνο στοιχεία τμήματος/ομάδας και πλήθος παικτών (όχι ονόματα μαθητών).
3. Προεπιλογή κλήρωσης: Κανόνας Α (ισοβαθμία 1ης θέσης).
4. Στο MVP η διεπαφή είναι μία responsive web σελίδα με ενότητες Host/Player/Admin.

## Επιλογή στοίβας
Επιλέχθηκε η **Επιλογή 2** (Node + Socket.io + SQLite WAL) για απλότητα, offline λειτουργία και εύκολο backup του αρχείου DB.

## Αρχιτεκτονική
- **Express REST API** για δημιουργία συνεδριών, απαντήσεις, αναφορές, κλήρωση.
- **Socket.io** για real-time turn updates και scoreboard sync.
- **SQLite (better-sqlite3)** σε WAL mode για αντοχή σε πολλαπλές αναγνώσεις/εγγραφές.
- **Single-page mobile-first UI** με μεγάλα κουμπιά και ελληνικό κείμενο.

## Ροές
### Admin
- Login με env password.
- Βλέπει συνεδρίες/αποτελέσματα.
- Εκτελεί κλήρωση με crypto RNG και εμφανίζει αποδεικτικό.

### Host
- Δημιουργεί συνεδρία (Τάξη/Τμήμα + 3 ομάδες).
- Εκκίνηση παιχνιδιού → γίνεται επιλογή 15 μοναδικών ερωτήσεων.
- Προωθεί turn ανά ερώτηση.

### Player
- Join με session code.
- Απαντά μόνο όταν είναι ενεργή η ομάδα του.
- Βλέπει άμεση ενημέρωση σκορ.

## Διαφάνεια κλήρωσης
Αποθηκεύεται `proof_json` με timestamp, κανόνα, candidate ids, randomHex, winner και SHA256 input hash.

## Wireframe περιγραφή
- **Host panel**: φόρμα νέας συνεδρίας, κουμπί έναρξης, live scoreboard.
- **Player panel**: πεδίο session code, επιλογές A/B/C/D, χρονόμετρο.
- **Admin panel**: login, κουμπί run lottery, proof viewer, export area.
