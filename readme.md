# Trivia 25ης Μαρτίου (School LAN Edition)

Web εφαρμογή trivia για ταυτόχρονο παιχνίδι ανά τμήμα, με 3 ομάδες ανά τμήμα, live scoreboard και τελική κλήρωση με αποδεικτικό διαφάνειας.

## Γρήγορη εκκίνηση
1. `cp .env.example .env`
2. `npm install`
3. `npm run migrate`
4. `npm run seed`
5. `npm start`
6. Άνοιξε `http://localhost:3000`

## Docker
`docker compose up --build`

## Windows/Linux σε σχολικό PC
- Εγκατάσταση Node.js 20 LTS και Git.
- Άνοιγμα τερματικού στον φάκελο έργου.
- Εκτέλεση των βημάτων «Γρήγορη εκκίνηση».
- Σε LAN, μοιράζεις το URL `http://IP_SERVER:3000`.

## Backup / Restore ΒΔ
- Backup: αντιγραφή του αρχείου `data/app.db` (ιδανικά όταν η εφαρμογή είναι κλειστή).
- Restore: αντικατάσταση `data/app.db` με το backup.

## Scripts
- `npm run migrate` : SQL schema.
- `npm run seed` : εισαγωγή 40+ ερωτήσεων από JSON.
- `npm test` : tests scoring/lottery logic.

## Σύντομες πηγές ερωτήσεων
Οι αναφορές αποθηκεύονται στο `source_ref` κάθε ερώτησης (σχολικά βιβλία Ιστορίας, ΥΠΑΙΘ, εγκυκλοπαιδικές αναφορές για Ναβαρίνο/1821).
