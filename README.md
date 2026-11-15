# Természettudományi Tanári – Információs Kijelző

Középiskolai természettudományos tanári előtti kijelzőre optimalizált, könnyűsúlyú webalkalmazás (Raspberry Pi 3 Chromium kioszk módhoz tervezve), valós idejű Firebase Firestore adatbázissal és iskolai Microsoft autentikációval védett admin felülettel.

## Főbb funkciók

### Kijelző nézet (`/#/`)
- **Folyamatosan látszó hirdetmények:** Jobb oldali sávban, normál és kiemelt (sürgős) jelzéssel.
- **Következő 7 nap eseményei:** Alsó, folyamatosan scrollozó sávban megjeleníti a következő 7 nap naptári eseményeit.
- **Automatikus Carousel (30–60 mp):**
  1. **Aktuális földrengés térkép** (USGS GeoJSON élő adatok + könnyűsúlyú SVG világtérkép)
  2. **A nap veszélyeztetett állata** (Magyar Wikipédia: *Magyarországon fokozottan védett állatok* kategória)
  3. **Aktuális időjárási térkép frontokkal** (DWD szinoptikus fronttérkép + Open-Meteo helyi adatok)
  4. **Aktuális napfolt- és napszél-tevékenység** (NASA SDO napkorong + NOAA SWPC Kp-index, napszél, Bt/Bz)
  5. **A nap természettudományi Nobel-díjasa** (Nobel Prize API + Wikipédia portré/leírás)
  6. **Napi Fun Fact** (beépített magyar tudományos gyűjtemény + adminban felvehető saját tények)

### Admin felület (`/#/admin`)
- **Iskolai Microsoft belépés** (`OAuthProvider('microsoft.com')`) opcionális domain/email szűréssel.
- Hirdetmények létrehozása, elrejtése/aktiválása, törlése.
- Naptári események felvétele (a következő 7 napba eső események automatikusan megjelennek a kijelzőn).
- Saját iskolai Fun Factek kezelése.
- Kijelző beállítások: carousel váltási idő (30–60 mp), aktív panelek, fronttérkép URL, helyszín koordináták.

---

## Helyi fejlesztés és kipróbálás

```bash
npm install
npm run dev
```

Ha még nincs `.env` fájl beállítva, az alkalmazás automatikusan **Helyi Demó Módban** indul (`localStorage` használatával), így mind a kijelző, mind az admin felület azonnal kipróbálható.

---

## Firebase és Microsoft Autentikáció beállítása

1. Hozz létre egy projektet a [Firebase Console](https://console.firebase.google.com/)-on.
2. Kapcsold be a **Firestore Database**-t, és töltsd fel a `firestore.rules` szabályokat.
3. Az **Authentication -> Sign-in method** menüben engedélyezd a **Microsoft** szolgáltatót:
   - Az Azure Portalon (Microsoft Entra ID -> App registrations) hozz létre egy új alkalmazást.
   - Redirect URI-nak add meg a Firebase által adott callback URL-t (`https://<projekt-id>.firebaseapp.com/__/auth/handler`).
   - Másold át az Application (client) ID-t és Client Secret-et a Firebase Microsoft beállításaiba.
4. Másold le a `.env.example` fájlt `.env` néven, és töltsd ki a Firebase Web App adataival (valamint opcionálisan a `VITE_ALLOWED_ADMIN_DOMAIN` értékkel, pl. `iskola.hu`).

---

## Raspberry Pi 3 Kioszk mód

A Raspberry Pi 3-on a Chromium böngészőt teljes képernyős kioszk módban érdemes indítani (pl. `~/.config/lxsession/LXDE-pi/autostart` fájlban):

```bash
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk https://<te-oldalad-url>/
```

---

## Feltöltés GitHub-ra

```bash
git init
git add .
git commit -m "Initial commit: Termeszettudomanyi kijelzo es admin felulet"
git branch -M main
git remote add origin https://github.com/gnadori/termtud_display.git
git push -u origin main
```
