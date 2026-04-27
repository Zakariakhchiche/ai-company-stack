# PLAN D'ACTION — fct vers premières ventes

**Auteur** : Board / CEO agent
**Date** : 2026-04-21
**Objectif** : signer 1 à 3 premiers deals en 14 jours sans attendre Cycle 1.

---

## 1. Constat honnête

35 issues Paperclip, 8 agents productifs, 0 revenue. Le bottleneck n'est pas la stratégie — c'est l'absence d'exécution terrain. Ce plan corrige ça.

## 2. Principe directeur

- Les agents deviennent des **machines à munitions** : copy, listes, scripts, proposals, assets.
- **TOI tu es le canon** : LinkedIn DMs, Gmail, calls, closings. Rien ne part dans la vraie vie sans toi.
- Pas de nouvel outil > 30€/mois tant qu'il n'y a pas 1 deal signé.

## 3. Outils à provisionner aujourd'hui (30-45 min, 10-15€)

- [ ] **Domaine** : acheter `fctpro.fr` ou équivalent sur OVH/Namecheap. 10€/an.
- [ ] **Cal.com** free : créer slot "Discovery 20 min". 0€.
- [ ] **HubSpot CRM Free** : compte + import LinkedIn contacts. 0€.
- [ ] **Netlify** (login GitHub) : pour déployer landings. 0€.
- [ ] **Google Sheet "fct Pipeline"** : voir schéma § 7.

### Credentials à rapatrier dans `.env` pour débloquer les agents

```
HUBSPOT_PRIVATE_APP_TOKEN=pat-...
CAL_COM_API_KEY=cal_live_...
NETLIFY_AUTH_TOKEN=...
GOOGLE_SHEETS_API_KEY=AIza... (+ SHEET_ID)
GMAIL_APP_PASSWORD=... (ou OAuth)
APP_DOMAIN=fctpro.fr
```

### À ne pas acheter maintenant

Lemlist, Pipedrive payant, Phantombuster, Notion Team, Sales Nav. On verra après deal 1.

---

## 4. Sprint 14 jours — planning quotidien

**Engagement toi** : 1h30/jour × 5 jours/semaine × 2 semaines = 15h.

### Semaine 1 — Prospection + Discovery

| Jour | Toi (1h30) | Agents (livrent au matin) | KPI |
|---|---|---|---|
| **J1 Lun** | Liste 30 prospects 1st-degree LinkedIn × 4 ICP. Import HubSpot. | SDR : 4 templates DM × 4 ICP + 3 hooks chacun | 30 dans HubSpot |
| **J2 Mar** | 10 DMs LinkedIn perso + track HubSpot | SDR : séquence follow-up D+3 D+7 | 10 DM |
| **J3 Mer** | 10 DMs + 5 emails Gmail warm | HoG : draft post LinkedIn | 10 DM + 5 mails |
| **J4 Jeu** | Post LinkedIn + 10 DMs + réponds replies | Designer : visuel carrousel | 1 post + 1-2 calls bookés |
| **J5 Ven** | Discovery calls + proposals | HoG : template proposal 1-page | 2-4 calls faits |

**KPI fin S1** : 30-40 DMs, 10-15 mails warm, 1 post, 3-6 calls, 1-2 proposals.

### Semaine 2 — Closing + scale

| Jour | Toi | Agents | Livrable |
|---|---|---|---|
| **J8 Lun** | 3 calls + 10 DMs | Engineer : landing IA v0 Netlify | Landing live |
| **J9 Mar** | 2-3 proposals + relance J-5 | HoG : relance J+4 post-proposal | 3 proposals |
| **J10 Mer** | 10 DMs + 2 calls closing | Designer : one-pager PDF | Offre PDF |
| **J11 Jeu** | Post case study | Marketing : 5 hooks suivants | Post publié |
| **J12 Ven** | Closings + nouveaux calls | RevOps : pipeline update | Pipeline OK |
| **J13-J14** | Finalisation deals | Reviewer : audit qualité outreach | 0-3 deals signés |

**KPI fin S2** : 80-100 DMs, 25-40 conversations, 8-15 calls, 3-6 proposals, **1-3 deals**.

---

## 5. Répartition agent-first (tool-free)

| Agent | Job tool-free | Output quotidien |
|---|---|---|
| **CEO** | Daily nudge 3 questions matin | Inbox : "qui tu contactes / quel deal / quel blocker" |
| **HoG** | Head of Copy | 1 post + 3-5 variants DM par ICP |
| **SDR** | Sequence writer + perso | 10-20 messages perso si tu donnes les prospects |
| **Designer** | Asset machine | 1-2 visuels/jour |
| **Engineer** | Landing + integrations (quand creds OK) | 1 landing deployable |
| **RevOps** | Pipeline tracker | Update HubSpot + Sheet + rapport hebdo |
| **CTO** | Offre architect | 1 doc/jour (FAQ, case study, techspec) |
| **Reviewer** | Relecture DMs + posts avant envoi | QA on-demand |

---

## 6. Offres prioritaires (ordre de push)

1. **Portage salarial** — cycle court 1-2 semaines, pain clair, target freelance IT réseau. **#1 cette quinzaine.**
2. **Formation Data/IA** — cycle 2-4 semaines, ticket 6-8k€. **#2**, upsell post-portage.
3. **Conseil IA/Data** — cycle 1-3 mois, ticket 30k€+. **Semer, pas closer** avant S4.
4. **IA/Automation** — cycle 3-6 mois B2B. **Seed posts LinkedIn** pour pipe futur.

---

## 7. Google Sheet Pipeline (schéma minimal)

Colonnes : `nom | company | title | icp | offer | source | status | next_action | owner | deadline | notes`

- **icp** : portage / ia / conseil / formation
- **source** : linkedin_1st / linkedin_2nd / gmail_warm / event / referral / inbound
- **status** : contacté / répondu / discovery_booké / discovery_done / proposal_envoyée / won / lost / no_response
- **next_action** : date + verbe précis ("relancer avec case study 2026-04-25")
- **owner** : zak / hog / sdr
- **notes** : trigger, contexte, objection

Partage en édition à l'admin agents — ils écrivent via API Google Sheets.

---

## 8. Règles de discipline

- **Pas de nouvelle prospection tant que les follow-ups de la veille ne sont pas faits**.
- **Chaque DM a un trigger concret** visible sur LinkedIn (post, nouveau job, annonce). Pas de "J'ai vu ton profil".
- **Cal.com = seule porte d'entrée RDV**. Pas de back-and-forth créneaux.
- **Toute proposal a un prix clair**. Tier Starter / Growth / Scale minimum.
- **Tout prospect qui répond est loggé dans HubSpot dans l'heure**. Sinon il disparaît.

---

## 9. Escalation si signaux faibles à J7

- **< 3 replies sur 30 DMs** → copy KO. HoG rewrite avec angle différent (pain au lieu de solution, question ouverte au lieu d'ask).
- **3-5 replies mais 0 calls** → Cal.com intimide. Pivot : "30 min exploration, je t'offre X" (magnet gratuit).
- **Calls sans proposal** → offres mal positionnées. HoG + CTO revoient one-pager.
- **Proposals sans closing** → pricing KO. -30% pour les 3 premiers, "founding customers".

---

## 10. Check-list TOI aujourd'hui (45 min)

- [ ] 15 min : acheter domaine OVH
- [ ] 10 min : Cal.com + slot Discovery 20min
- [ ] 10 min : HubSpot free
- [ ] 5 min : Netlify via GitHub
- [ ] 5 min : dupliquer schéma § 7 dans Google Sheet neuf
- [ ] Répondre à Claude avec les 4 URLs + coller API tokens dans `.env`

Quand c'est fait, je débloque les agents pour qu'ils écrivent dans HubSpot + Cal.com + Google Sheet, et on démarre J1 dans la foulée avec 30 prospects et 4 DM templates prêts.

---

**Règle finale** : plus aucune ligne de stratégie/governance/handbook écrite tant qu'il n'y a pas 50 DMs sortants + 3 discovery calls. Juste du terrain.
