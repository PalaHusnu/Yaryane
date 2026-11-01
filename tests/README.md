# Funktionsprüfungen

Mit Node.js 20 oder neuer ausführen; keine zusätzlichen Pakete nötig.

```sh
TZ=Europe/Berlin node tests/cloud-integrity.cjs
TZ=UTC node tests/cloud-integrity.cjs
```

Der Cloud-Test führt auch die Tests für Hauptversion und Vorschau aus. Er prüft die tatsächlichen Inline-Skripte aus `index.html` und `vorschau/index.html`. Browser-APIs und Firebase werden simuliert; es gibt keine echten Cloud-Zugriffe, Anmeldungen oder Änderungen an Nutzerdaten.

Abgedeckt: sechs Ansichten, Speicherung und Rollback, Import/Export/Rückfallkopie, Schema-Prüfung, sichere Kennungen, Bearbeiten/Löschen, Aufgaben, Notizen, Schichten, Wiederholungen, Monatsgrenzen, Nachtdienst-Überschneidungen, Yane-Zeitfenster, Theme, Formulardialoge und Cloud-Rennen.

Vor Freigabe zusätzlich auf einem echten iPhone prüfen: Tastatur, Datum-/Zeitfelder, Touch-Ziele, Dateidownload und Import sowie Cloud-Abgleich mit einem Testkonto. Die Vorschau verwendet eigene Browser-Schlüssel; bisherige Live-Daten werden weder migriert noch gelöscht.
