# Ocean Rescue — Zasady gry (skrót na jedną stronę)

> Pełne, wiążące zasady: `docs/mechanics.md`. Liczby w nawiasach «…» to wartości do dostrojenia
> symulatorem. Wszystko, co widzą drużyny, jest po polsku.

## Cel
12 drużyn dzieci (8–14 lat) przez ~14 dni eksploruje ocean. **Wygrywa drużyna z największą liczbą
Punktów Ratunku.** Równolegle wszyscy wspólnie kompletują **Album Zwierząt** (cel kooperacyjny).

## Komponenty
- **Mapa Oceanu** — siatka **26×26**, współrzędne literowo-liczbowe (`A1`…`Z26`). Na planszy A1 **nie ma
  wartości** — są tajne i stałe, tylko w tabeli Mistrza Gry (MG). Odwiedzone pola oznacza się naklejkami.
- **Kostka Pogody** — **d12** (mieszanka kierunków kompasu, „Cisza", „Sztorm" — proporcje WIP).
- **Wiatry** — **5 typów**: ↑ Góra, ↓ Dół, ← Lewo, → Prawo, **★ Dżoker** (dowolny kierunek przy użyciu).
  Zdobywa się je **losując** i zapisując na karcie drużyny. Wydaje się je **tylko** na zagadki.
- **Mapy Archipelagu (zagadki)** — przesuwane łamigłówki (5×5–8×8), **indeksowane**; na arkuszu **nie ma
  rozwiązania ani wymaganych ruchów**.
- **Karty Zwierząt** — **unikatowe, równe** (bez wartości punktowej), pogrupowane w **kategorie**
  (domowe / wymarłe / jadowite / …). Trafiają do wspólnego Albumu.

## Tura
**Tura = jedna wizyta drużyny u MG** (jeden kierunek + jeden rzut). **Każda drużyna ma tyle samo tur** —
to twarda zasada. Kalendarz jest **żywy** (MG może dodać turę), ale dodaje ją **wszystkim** drużynom.
Gra kończy się po **ustalonej, równej liczbie tur** — nigdy z powodu wyczerpania talii czy planszy.

## Ruch (raz na turę)
1. **Wybierz kierunek** (Północ/Wschód/Południe/Zachód).
2. **Rzuć kostką (d12).** Wynik względem wybranego kierunku ustala **liczbę ruchów `X`** (baza «3», ±)
   i **kurs**:
   - **Wiatr w plecy** (kostka = kierunek) → daleko prosto, `X=«4»`
   - **Wiatr w twarz** (przeciwny) → krótko prosto, `X=«2»`
   - **Wiatr boczny** (prostopadły) → **po przekątnej**, `X=«3»`
   - **Sztorm** → daleko prosto, `X=«4»`, każde pole **−«1»** łupu
   - **Cisza** → krótko prosto, `X=«2»`, każde pole **+«2»** łupu
3. **Płyń:** statek **przeskakuje pola odwiedzone** (nie liczą się) i **zatrzymuje się na każdym
   nieodwiedzonym polu**, aż wykona `X` przystanków. Przy krawędzi **odbija się (ricochet)** — ruch zawsze
   jest pełny, drużyna **nigdy nie utyka**.
4. **Łup z KAŻDEGO przystanku:** MG odczytuje stałą tajną wartość pola i dolicza na żywo: modyfikator
   Sztorm/Cisza + modyfikator dnia + ewentualny bonus wyrównawczy. Oznacz każde pole naklejką.

## Wiatry i zagadki
- Łup „Dobierz N Wiatrów" → drużyna **losuje N kafli** (↑/↓/←/→/★) i zapisuje je na karcie.
- **Bez limitu zagadek** w ręku ani oddawanych. **Żonglowanie ograniczonymi, kierunkowymi Wiatrami między
  wieloma zagadkami to główna mechanika.**
- Drużyna sama wymyśla rozwiązanie i **wydaje Wiatry**, których faktycznie użyła (Dżoker = dowolny
  kierunek). MG sprawdza poprawność z tajnym kluczem i przyznaje **nagrodę z indeksu mapy** (mniejsza/
  łatwiejsza = mniejsza nagroda).

## Punktacja — dwie oddzielne waluty
- **Punkty Ratunku (rywalizacja):** zapisywana liczba; najwięcej = zwycięstwo. **Limit na wizytę** —
  nadwyżka przepada (ale **Wiatry z oddanych zagadek zostają**). Limit hamuje liderów i kradzież przewagi
  przez gromadzenie zagadek.
- **Uratowane Zwierzęta (kooperacja):** unikatowe, równe karty do wspólnego **Albumu**, **maks. 3 na
  wizytę**, wg kategorii. Brak kart = nic się nie dzieje (Punkty Ratunku bez zmian). Skompletowanie
  **kategorii** → ogólnoobozowa nagroda.

## Wyrównywanie szans (hybryda)
- **Reguła drukowana:** najsłabsze «4» drużyny dostają automatyczny bonus zależny od straty do lidera.
- **Ograniczona decyzja MG (zapisywana):** mały dodatkowy bonus **lub jeden dodatkowy ruch** (ruch w
  ramach tury — **nigdy dodatkowa tura**). Główne wyrównanie i tak daje limit Punktów Ratunku na wizytę.

## Start drużyny
6 Wiatrów (zrównoważony zestaw, w tym Dżoker), 0 Punktów Ratunku, 2 startowe zagadki. Pole startowe drużyna
**wybiera sama** (staje się odwiedzone, bez łupu).
