# V6 REGISTR ROZHODNUTÍ — interní pracovní dokument

## A. PŘEJMENOVÁNÍ A SLOUČENÍ TABULEK (finální jméno vlevo = závazné)

| FINÁLNÍ NÁZEV | Staré/konkurenční názvy zrušené | Důvod |
|---|---|---|
| `payment_documents` | `financial_documents` | sjednoceno v V5, zahrnuje i příjmy SPVPP ne jen výdaje |
| `payment_document_items` | `financial_document_items` | následuje payment_documents |
| `service_transactions` | — (zachováno, ale FK přejmenován) | `financial_document_id` → `payment_document_id` |
| `approval_workflows` / `approval_steps` | `approval_workflow_templates` / `approval_workflow_steps` (V4 pojmenování) | V5 přijal kratší název z doplňkové sady, V6 ho potvrzuje jako finální |
| `document_approvals` | `approval_instances` (V4) | sjednoceno na kratší název ze stejné sady jako approval_workflows |
| `approval_history_logs` | `approval_instance_steps` (V4) | tamtéž |
| `person_relationships_extended` | `child_relationships` (orig. kap. 29) + `person_relationships` (V3 kap. 2, nikdy nepoužitá) | V6: přejmenuje se na `person_relationships` (bez "extended" — V3 verzi nikdo nenaplnil, takže název je volný a čistší) |
| `ospod_offices` | — | zachováno, rozšířeno o `parent_authority_id` |
| `administrative_authorities` | — | nová, úroveň 1 hierarchie institucí |
| `medical_facilities` | — | nová, úroveň 2 hierarchie zdravotnictví |
| `organization_branches` | — | zachováno z V5 |
| `foster_parent_status` (enum) + `persons.foster_parent_status` | `lifecycle_state` zůstává PRO households, toto je NOVÉ pro persons | dvě different entity, ne náhrada |
| `bank_transactions` | `bank_statement_lines` (V4 pojmenování) | V6 přijímá `bank_transactions` z doplňkové sady — kratší, konzistentní s `bank_statements` |
| `crisis_cases`/`crisis_actions`/`crisis_resolutions` | — | beze změny |
| `ai_bi_finance_view` / `ai_bi_events_view` | `ai_chat_*` (V4 vlastní pipeline) | V5 rozhodnutí, definitivní |
| `ai_bi_query_logs` | `ai_interaction_logs` (RAG, zachováno samostatně) + `ai_chat_messages` (V4, zrušeno) | ai_interaction_logs zůstává PRO RAG/legislativu, ai_bi_query_logs je PRO BI/text-to-SQL — DVĚ ROZDÍLNÉ tabulky, ne duplicita |
| `export_templates` / `export_logs` | `output_templates` / `generated_outputs` (V4 pojmenování) | V6 přijímá kratší název ze sady řešící i accountant_access_tokens |
| `accountant_access_tokens` | `external_accountant_access` (V4) | sjednoceno |
| `providers` | — | beze změny, ale nyní explicitně NENÍ podtypem persons (zůstává samostatná tabulka, viz Karta kontaktu poznámka) |

## B. ENUM vs. TAXONOMY_TERM — FINÁLNÍ BINÁRNÍ ROZHODNUTÍ

Pravidlo rozhodování: pokud na hodnotě visí CHECK constraint, výpočet částky, nebo bezpečnostní pravidlo → ENUM.
Pokud je to čistě popisný/organizační štítek bez vlivu na logiku → taxonomy_term.

| Typ | Rozhodnutí | Důvod |
|---|---|---|
| `person_category` | ENUM (rozšířený) | ovlivňuje RLS a validace |
| `entity_status` | ENUM | ovlivňuje viditelnost v dotazech napříč celým systémem |
| `foster_care_type` (A/B/C) | ENUM | vázáno na legislativní výpočty (SPVPP kategorie) |
| `foster_parent_status` | ENUM | vázáno na workflow přechodů s podmínkami |
| `relationship_rating` (A-Z) | ENUM | vázáno na bezpečnostní logiku (rating Z = banner) |
| `lifecycle_state` (households) | ENUM | stavový automat s podmínkami přechodu |
| `event_type` | ZRUŠEN jako ENUM → nahrazen `event_definitions.event_type TEXT` + taxonomy | již ve V4 bylo configuration-driven, V6 to dotahuje důsledně |
| `event_category` | taxonomy_term (`system_taxonomies.machine_name = 'event_categories'`) | čistě filtrovací/UI kategorie |
| `task_priority` | ENUM | vázáno na eskalační logiku |
| `task_status` | taxonomy_term (`task_states`) | bylo to explicitně zmíněno jako kandidát v doplňkové sadě, V6 to potvrzuje |
| `crisis_type` | ENUM | vázáno na automatické post_actions (workflow lite) |
| `crisis_status` | ENUM | stavový automat s tvrdým vyžadováním crisis_resolutions |
| `contact_form` | ENUM | vázáno na soft-blokaci (porovnání s court_decisions povolenými formami) |
| `contact_status` | taxonomy_term (`contact_statuses`) | popisné, bez vlivu na výpočet |
| `provider_type` | ENUM | vázáno na schvalovací podmínky a CHECK constraints |
| `payment_document_status` | ENUM | stavový automat |
| `document_category` | taxonomy_term (`document_categories`) | explicitně zmíněno jako kandidát |
| `decision_type` (court) | ENUM | malá, stabilní množina se zákonným významem |
| `supervision_type` | taxonomy_term | organizační kategorie bez vlivu na výpočet |
| `education_form` | taxonomy_term | popisné |
| `education_status` | ENUM | vázáno na 24h compliance výpočet |
| `notification_channel` / `notification_priority` | ENUM | vázáno na dispatcher routing logiku |
| `retention_action` | ENUM | vázáno na CRON exekuci, kritická bezpečnost dat |
| `subscription_tier` | ENUM | vázáno na limity a feature flags |
| `export_format` / `export_recipient` | ENUM | malá stabilní množina, vázaná na template matching |
| `relationship_type` (otec/matka/kamarád...) | taxonomy_term (`relationship_types`, hierarchický) | explicitně byl navržen jako dynamický v originále, V6 potvrzuje |

## C. ZÁVISLOSTI PRO TOPOLOGICKÉ SERAZENÍ SCHEMA.SQL

```
0. EXTENSIONS (uuid-ossp, vector)
1. organizations
2. system_taxonomies, taxonomy_terms (závisí na organizations - nullable)
3. permissions, roles, role_permissions (závisí na organizations - nullable)
4. profiles (závisí na organizations) -- POZOR: závisí na auth.users (Supabase), řešeno FK bez ON DELETE
5. user_roles (závisí na profiles, roles)
6. organization_branches (závisí na organizations)
7. profiles.branch_id, households.branch_id (ALTER, závisí na organization_branches)
8. system_parameters (závisí na organizations - nullable)
9. administrative_authorities (samostatná)
10. ospod_offices, ospod_workers (závisí na administrative_authorities)
11. schools, school_teachers (závisí na administrative_authorities)
12. medical_facilities, doctors (závisí na administrative_authorities)
13. courts, court_judges (samostatné)
14. extracurricular_providers (závisí na organizations)
15. households (závisí na organizations, profiles, organization_branches)
16. persons (závisí na organizations) -- Karta kontaktu, obsahuje custom_fields JSONB
17. household_members (závisí na households, persons)
18. person_relationships (závisí na persons, taxonomy_terms) -- přejmenováno z child_relationships/extended
19. person_past_names, person_citizenships, person_residency_history,
    person_contacts, person_address_history (vše závisí na persons)
20. person_education_history (závisí na persons, schools, school_teachers)
21. person_report_cards, person_medical_history, person_physiological_metrics,
    person_identity_documents, person_consents, person_guardians,
    person_photo_documentation (závisí na persons + příslušné registry)
22. agreements (households)
23. events (households, persons, profiles)
24. event_definitions (organizations - nullable)
25. documents (organizations, households, persons) -- musí být PŘED court_decisions, financial atd.
26. document_folders, document_annotations, rich_text_documents, rich_text_document_versions,
    rich_text_attachments (závisí na documents/organizations)
27. court_cases, court_hearings, court_decisions (households, persons, courts, documents)
28. contact_plans, contact_schedules, contact_supervisions (persons, court_decisions)
29. crisis_cases, crisis_actions, crisis_resolutions (households, persons)
30. tasks, task_assignments, task_comments, task_entity_links, projects (profiles, households, persons, crisis_cases)
31. supervisions, supervision_participants, supervision_notes, supervision_recommendations (profiles, households)
32. education_records (profiles, documents)
33. document_templates, template_versions, generated_documents (organizations, households)
34. retention_policies, data_deletion_logs, archive_jobs (organizations)
35. user_notification_preferences, notifications, notification_delivery_logs (profiles)
36. providers (organizations) -- Karta kontaktu konceptuálně, ale SAMOSTATNÁ tabulka technicky
37. payment_documents, payment_document_items (providers, households, persons, documents)
38. service_transactions (persons, payment_documents)
39. spvpp_parameters, statutory_deadlines (organizations - nullable)
40. approval_workflows, approval_steps, document_approvals, approval_history_logs
    (organizations, payment_documents, permissions)
41. bank_statements, bank_transactions (organizations, documents, payment_documents)
42. export_templates, export_logs, accountant_access_tokens (organizations)
43. legal_frameworks, knowledge_base_sources, knowledge_base_articles, knowledge_base_sync_logs
    (organizations, households - nullable)
44. ai_interaction_logs (organizations, profiles)
45. ai_bi_finance_view, ai_bi_events_view (VIEW, závisí na payment_documents, events)
46. ai_bi_query_logs (organizations, profiles)
47. ai_assistant_profiles, ai_assistant_sources (organizations, knowledge_base_sources)
48. crawler_discovered_assets (knowledge_base_sources)
49. client_requests (households, profiles, documents, payment_documents)
50. case_transfers (organizations, households)
51. lifecycle_transitions (households, documents)
52. foster_parent_status_history (persons, profiles)
53. organization_sequences, outgoing_communications (organizations, documents)
54. table_view_definitions, table_available_fields, table_view_user_preference (organizations, profiles)
55. organization_subscriptions (organizations)
56. mv_ko_workload, mv_cost_per_child (MATERIALIZED VIEW, závisí na profiles/households/persons/payment_documents)
57. organization_metrics_history, organization_statistics_daily, global_statistics_daily (organizations)
58. audit_logs (organizations) -- triggery se aplikují AŽ NA KONCI, po vytvoření všech tabulek
```

## D. NOVÉ V6 OPROTI V5 (skutečně chybějící kusy zjištěné při konsolidaci)

1. RLS policy šablona generovaná pro KAŽDOU tabulku s organization_id (ne jen households ukázkově)
2. Seed data: permissions (kompletní seznam ~40 kódů), taxonomy_terms (výchozí hodnoty pro každou tabulku z bodu B), system_parameters (výchozí zákonné hodnoty)
3. Explicitní pořadí CREATE TRIGGER (audit) — až po všech tabulkách, ne prokládaně
4. package.json / requirements pro Next.js stack s pevnými verzemi
5. .env.example šablona
6. Fáze 0 — repo setup, CI, acceptance test pro konec každé fáze
