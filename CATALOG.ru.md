# Каталог Orbit: все скиллы по порядку цикла (89 шт.)

[English](CATALOG.md)

Номер шага — `фаза.микрофаза.порядок`. Выход шага — вход следующего; результаты лежат в `.orbit/` (см. `ARTIFACTS.md`). Интерактивная версия — `map/index.html`.

## ① Разобраться — понять задачу, систему и риски; договориться о спеке до кода

### 1.1 Приём задачи

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.1.1 | `clarify-task` | Довести задачу до однозначной: вопросы по одному с предложенным ответом; стоп-кран при расхождении в середине работы. | brief.md → `capture-requirements` | Matt Pocock Skills «grill-me, wait-what» |
| 1.1.2 | `capture-requirements` | Бизнес-запрос или PRD → требования (LD/UC/R/NF) с критериями приёмки и измеримыми нефункциональными. | requirements.md → `shape-idea` | backend-skills «writing-business-requirements» |
| 1.1.3 | `shape-idea` | Идея → согласованный дизайн: разговор о «зачем», 2–3 подхода, дизайн по частям до кода. | design.md → `map-knowledge` | Superpowers «brainstorming» |

### 1.2 Разведка кода

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.2.1 | `map-knowledge` | Граф знаний кодовой базы: модули и связи с доказательствами file:line + обзор системы. | .orbit/knowledge/graph.json + overview.md → `explain-code` | Understand Anything «understand» |
| 1.2.2 | `index-code` | Рабочий индекс кода: сначала индекс, потом точечное чтение — меньше токенов и вызовов. | .orbit/knowledge/index/ → `explain-code` | Graft / Trail-code «graft» |
| 1.2.3 | `survey-codebase` | Состояние базы в 7 документах: стек, интеграции, архитектура, структура, соглашения, тесты, проблемы. | .orbit/knowledge/codebase/*.md → `scan-risks` | GSD (Get Shit Done) «map-codebase» |
| 1.2.4 | `explain-code` | Объяснить модуль/файл/функцию по уровням: что делает, кто вызывает, поток, риски. | объяснение → `trace-impact` | Understand Anything «understand-explain» |
| 1.2.5 | `trace-impact` | Что задевает изменение: затронутые модули, потребители, внешние контракты, уровень риска. | радиус поражения → `review-code` | Understand Anything «understand-diff» |
| 1.2.6 | `recall-history` | Вспомнить прошлую работу: память, .orbit/learnings, ADR, git, прошлые сессии, MR. | найденное с источниками → `keep-learnings` | claude-mem «mem-search» |

### 1.3 Реверс-инжиниринг

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.3.1 | `reverse-app` | Вход в реверс: рамка «чья цель и зачем», маршрут по типу цели, журнал наблюдение/вывод/неизвестно. | .orbit/reverse/<target>/findings.md → `teardown-artifact` | REA «reverse-engineer-anything», Craft Anything «Craft Anything» |
| 1.3.2 | `teardown-artifact` | Разобрать артефакт: JAR, Docker-образ, Helm-чарт, npm/pip, APK/IPA, Electron, PyInstaller. | состав, версии, конфиги, риски → `review-security` | REA «reverse-engineer-anything» |
| 1.3.3 | `analyze-binary` | Разобрать бинарник ELF/Mach-O/PE/.NET/JVM: зависимости, возможности, логика, сравнение версий. | карта возможностей и ответы → `extract-rules` | REA «reverse-engineer-anything» |
| 1.3.4 | `recon-webapp` | Своё веб-приложение изнутри: маршруты, бандлы, API из HAR своей сессии, авторизация, флаги. | web-recon.md → `recover-api-spec` | Craft Anything «Craft Anything», REA «reverse-engineer-anything» |
| 1.3.5 | `recover-api-spec` | Восстановить OpenAPI/AsyncAPI по трафику, логам и коду клиента + контрактные тесты. | docs/api/*.yaml → `write-spec` | REA «reverse-engineer-anything» |
| 1.3.6 | `extract-rules` | Бизнес-правила из легаси в Given/When/Then с источниками и тестами-фиксаторами. | .orbit/knowledge/rules.md → `rebuild-clean` | REA «reverse-engineer-anything» |

### 1.4 Продукт и домен

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.4.1 | `teardown-product` | Разбор чужого продукта по публичным источникам: экраны, сценарии, модель данных, матрица функций. | recon.md + features.csv → `mine-user-pain` | Replica «replica-recon» |
| 1.4.2 | `mine-user-pain` | Боли пользователей из реальных отзывов и обращений: ненавидят, не хватает, не решено — с цитатами. | pain.md → `model-domain` | Replica «replica-entrepreneur» |
| 1.4.3 | `research-sources` | Исследование по первоисточникам: каждый факт со ссылкой и версией, сохранено в репо. | docs/research/*.md → `model-domain` | Matt Pocock Skills «research» |
| 1.4.4 | `model-domain` | Глоссарий и модель домена: термины с местом в коде, сценарии-проверки, ADR по делу. | GLOSSARY.md, ADR → `scan-risks` | Matt Pocock Skills «domain-modeling» |

### 1.5 Риски

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.5.1 | `scan-risks` | Быстрый скан рисков: данные, контракты, зависимости, откат, наблюдаемость, люди. | risks.md → `model-threats` | свой |
| 1.5.2 | `model-threats` | Модель угроз STRIDE по потокам данных до кода; меры → требования спеки. | risks.md (угрозы) → `write-spec` | свой |

### 1.6 Спецификация

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 1.6.1 | `write-spec` | Бриф, требования и дизайн → спека со сценариями WHEN/THEN, решениями и рисками. | спека → `run-spec-loop` | Matt Pocock Skills «to-spec» |
| 1.6.2 | `run-spec-loop` | Петля OpenSpec: proposal → дельта → код → карта → archive; включается по признакам репо. | openspec/changes/<id> → `plan-steps` | свой |

## ② Разработать — план → архитектура → код с тестами → проверка → выпуск

### 2.1 План

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.1.1 | `plan-steps` | План реализации малыми задачами: тест, код, команда проверки, статус в plan.md. | plan.md → `slice-tickets` | Superpowers «writing-plans» |
| 2.1.2 | `slice-tickets` | Нарезать работу на вертикальные срезы-тикеты с зависимостями и критериями приёмки. | тикеты → `prototype-fast` | Matt Pocock Skills «to-tickets» |
| 2.1.3 | `prototype-fast` | Одноразовый прототип на один вопрос: логика или внешний вид, за час-два. | ответ в design.md → `design-backend` | Matt Pocock Skills «prototype» |

### 2.2 Архитектура и данные

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.2.1 | `design-backend` | Оркестратор сервиса: требования → данные → архитектура → стек → срезы, с воротами согласия. | design-доки + сервис → `design-data` | backend-skills «building-backend-services» |
| 2.2.2 | `design-data` | Данные: сущности, хранилище, DDL, идемпотентность, индексы от сценариев, эволюция схемы. | data-design.md + ddl/ → `design-services` | backend-skills «backend-design-by-data» |
| 2.2.3 | `design-services` | Архитектура: границы, состояние, sync/async, события, кэш, где запускаемся. | architecture-design.md → `choose-stack` | backend-skills «backend-architecture» |
| 2.2.4 | `choose-stack` | Выбор/подтверждение стека: текущий стек по умолчанию, экосистема, платформа, версии. | stack-selection.md → `shape-modules` | backend-skills «backend-stack-selection» |
| 2.2.5 | `shape-modules` | Глубокие модули: маленький интерфейс, чистый шов, тесты через интерфейс; «сделай дважды». | структура модулей → `deepen-modules` | Matt Pocock Skills «codebase-design» |
| 2.2.6 | `deepen-modules` | Найти мелкие модули в существующем коде и предложить углубление с защитой тестами. | deepen.md → `plan-rebuild` | Matt Pocock Skills «improve-codebase-architecture» |
| 2.2.7 | `plan-rebuild` | Стек, схема и API для пересборки по разбору; первым — тонкий вертикальный срез. | architecture.md → `rebuild-clean` | Replica «replica-architect» |
| 2.2.8 | `rebuild-clean` | Пересобрать систему по разбору: спека как граница, новая реализация, сверка паритета. | новая система с паритетом → `add-code-mode` | Craft Anything «Craft Anything», Replica «пак Replica» |
| 2.2.9 | `add-code-mode` | Code mode для MCP-сервера: скрипт в песочнице против большого ответа, в контекст — только итог. | инструмент execute + песочница → `build-mcp` | code-mode «code-mode» |
| 2.2.10 | `build-mcp` | MCP-сервер для интеграции: инструменты под задачи агента, безопасность, оценки. | MCP-сервер → `test-first` | Skills by Anthropic «mcp-builder» |

### 2.3 Интерфейс

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.3.1 | `pick-ui-style` | Стиль, палитра, шрифты и UX-правила под тип продукта из базы решений. | ui-direction.md → `build-design-system` | UI UX Pro Max «ui-ux-pro-max» |
| 2.3.2 | `build-design-system` | Токены трёх уровней и спецификации компонентов со всеми состояниями. | tokens + components.md → `style-ui` | UI UX Pro Max «design-system» |
| 2.3.3 | `style-ui` | Интерфейс на shadcn/ui + Tailwind поверх токенов; доступность и адаптивность. | компоненты UI → `craft-frontend` | UI UX Pro Max «ui-styling» |
| 2.3.4 | `craft-frontend` | Выразительный интерфейс без шаблонного вида: направление до кода, типографика, композиция. | страницы и компоненты → `rebuild-design` | Skills by Anthropic «frontend-design» |
| 2.3.5 | `rebuild-design` | Восстановить дизайн-систему по образцу (миграция или разбор) со своими ассетами и проверкой контраста. | tokens.json + components.md → `test-first` | Replica «replica-design» |

### 2.4 Реализация

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.4.1 | `test-first` | Красный → зелёный → чистка; тест из сценария спеки; тест-фиксатор для старого кода. | код + тесты → `run-plan` | Superpowers «test-driven-development» |
| 2.4.2 | `run-plan` | Выполнить plan.md в одной сессии с контрольными точками и статусами. | реализованные задачи → `delegate-tasks` | Superpowers «executing-plans» |
| 2.4.3 | `delegate-tasks` | Каждая задача плана — свежему агенту, с ревью между задачами и эскалацией. | реализация + ревью → `run-parallel` | Superpowers «subagent-driven-development» |
| 2.4.4 | `run-parallel` | Независимые задачи параллельными агентами после проверки независимости. | сведённый результат → `isolate-branch` | Superpowers «dispatching-parallel-agents» |
| 2.4.5 | `isolate-branch` | Изолированная ветка или worktree под задачу в границах скоупа. | ветка / worktree + baseline → `code-backend` | Superpowers «using-git-worktrees» |
| 2.4.6 | `code-backend` | Как писать бэкенд: слои, именованные шаги, владелец ошибки, логи без секретов, три уровня тестов. | единообразный код → `build-screens` | backend-skills «backend-code-conventions» |
| 2.4.7 | `build-screens` | Интерфейс экран за экраном: оболочка → вертикальный срез → все экраны и состояния. | работающий фронт → `build-backend` | Replica «replica-build» |
| 2.4.8 | `build-backend` | Бэкенд: права на каждом запросе, миграции, фоновые задачи, интеграции через одобренные шлюзы. | бэкенд → `find-root-cause` | Replica «replica-backend» |

### 2.5 Отладка

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.5.1 | `find-root-cause` | Сначала быстрая петля воспроизведения, потом причина, потом одно исправление с тестом. | причина + исправление → `fix-ci` | Superpowers «systematic-debugging», Matt Pocock Skills «diagnosing-bugs» |
| 2.5.2 | `fix-ci` | Красный пайплайн: класс поломки, что изменилось, локальное воспроизведение, минимальный фикс. | причина + фикс → `prove-done` | свой |

### 2.6 Проверка качества

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.6.1 | `prove-done` | Никакого «готово» без свежей проверки и вывода в evidence.md. | evidence.md → `request-review` | Superpowers «verification-before-completion» |
| 2.6.2 | `request-review` | Ревью независимым агентом со стандартным пакетом: цель, diff от базы, критерии. | замечания → `handle-review` | Superpowers «requesting-code-review» |
| 2.6.3 | `handle-review` | Принимать ревью с проверкой: исправить верное, возразить фактами, не добавлять лишнего. | review.md → `review-code` | Superpowers «receiving-code-review» |
| 2.6.4 | `review-code` | Ревью изменения: ошибки, безопасность, соответствие спеке, масштаб, тесты, контракты. | отчёт ревью → `cut-complexity` | Matt Pocock Skills «code-review», Ponytail «ponytail-review» |
| 2.6.5 | `cut-complexity` | Лишняя сложность в изменении или во всём репо: что удалить, слить, упростить. | список упрощений → `review-security` | Ponytail «ponytail-review, ponytail-audit» |
| 2.6.6 | `review-security` | Ревью безопасности: OWASP/CWE, секреты, зависимости, образ, Kubernetes, CI. | находки с исправлениями → `test-flows` | свой |
| 2.6.7 | `test-flows` | Пройти сценарии приложения: план тестов, Playwright e2e, баг-репорты с доказательствами. | тесты + баг-репорты → `check-parity` | Replica «replica-test», Skills by Anthropic «webapp-testing» |
| 2.6.8 | `check-parity` | Паритет с образцом: балл по матрице функций, сравнение экранов, параллельный прогон для легаси. | parity.md → `finish-branch` | Replica «replica-diff» |

### 2.7 Выпуск

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 2.7.1 | `finish-branch` | Завершить ветку: проверки, варианты (MR/мерж/оставить), уборка — по согласию. | MR / мерж → `open-mr` | Superpowers «finishing-a-development-branch» |
| 2.7.2 | `open-mr` | MR/PR, который легко принять: размер, описание с рисками и OpenSpec/картой, проверка. | MR / PR → `ship-k8s` | Matt Pocock Skills «pr» |
| 2.7.3 | `ship-k8s` | Kubernetes, Helm, GitOps: отрендерить и сравнить, деплой через git, диагностика подов. | проверенный манифест / релиз → `project-map` | свой |

## ③ Сопровождать — карта, объяснение, документы, память, эксплуатация

### 3.1 Карта и схемы

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 3.1.1 | `project-map` | Интерактивная карта проекта одним HTML: фазы, шаги по ходу чтения, переходы, ссылки на код. | docs/project-map/project.html → `project-diagram` | свой |
| 3.1.2 | `project-diagram` | Статичная диаграмма фаз и шагов (SVG/PNG) для слайда и README; темы blueprint и paper. | docs/diagrams/*.svg / *.png → `draw-stack` | свой |
| 3.1.3 | `draw-stack` | Схема стека с логотипами и группами, HTML/PNG; без публикации наружу. | диаграмма → `publish-design-docs` | stack-diagram «stack-diagram» |
| 3.1.4 | `publish-design-docs` | Design-доки одной HTML-страницей для ревью людьми, с блоком «что решаем». | review.html → `onboard-people` | backend-skills «rendering-design-docs» |

### 3.2 Объяснение

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 3.2.1 | `onboard-people` | Гид для нового человека: что это, карта, запуск, сквозной сценарий, где осторожно, первые задачи. | docs/ONBOARDING.md → `teach-topic` | Understand Anything «understand-onboard» |
| 3.2.2 | `teach-topic` | Научить теме маленькими шагами с примерами из проекта и проверкой понимания. | понимание у человека → `cowrite-doc` | Matt Pocock Skills «teach» |

### 3.3 Документы и тексты

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 3.3.1 | `cowrite-doc` | Документ вместе с человеком: контекст → разделы → проверка свежим читателем. | документ → `instruct-agents` | Skills by Anthropic «doc-coauthoring» |
| 3.3.2 | `instruct-agents` | Инструкции для агентов: CLAUDE.md, промпты, описания скиллов — без противоречий. | текст для агента → `create-skill` | Matt Pocock Skills «writing-for-agents» |
| 3.3.3 | `create-skill` | Создать или улучшить скилл и встроить его в конвейер Orbit. | новый скилл → `write-update` | Skills by Anthropic «skill-creator» |
| 3.3.4 | `write-update` | Внутренние сообщения: статус, апдейт, рассылка, FAQ, апдейт по инциденту. | письмо / пост → `keep-learnings` | Skills by Anthropic «internal-comms» |

### 3.4 Память и передача

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 3.4.1 | `keep-learnings` | Выученное рядом с кодом: причины багов, отброшенные подходы, решения — читать до, писать после. | .orbit/learnings/ → `handoff-session` | Graft / Trail-code «trail» |
| 3.4.2 | `handoff-session` | Передача следующей сессии: цель, состояние, что пробовали, следующие шаги, какие скиллы взять. | handoff.md → `run-retro` | claude-mem «handoff», Matt Pocock Skills «handoff» |
| 3.4.3 | `run-retro` | Ретро по артефактам: сработало / мешало / попробовать → правила, знания, правки скиллов. | выводы + правки процесса → `track-debt` | Matt Pocock Skills «retro» |
| 3.4.4 | `track-debt` | Реестр техдолга с приоритетом «боль × частота ÷ цена». | реестр долга → `compress-context` | Ponytail «ponytail-debt» |
| 3.4.5 | `compress-context` | Сжать большие ответы и историю в своих LLM-приложениях: библиотека, свой обрезчик или code mode. | сжатие с замером → `review-observability` | Headroom «headroom» |

### 3.5 Эксплуатация

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 3.5.1 | `review-observability` | Увидим ли поломку: RED/USE, логи, трассы, алерты на симптомы, дашборд, пробы. | список пробелов → `write-runbook` | свой |
| 3.5.2 | `write-runbook` | Runbook для дежурного: проверить → исправить → эскалация → откат, команды целиком. | docs/runbooks/*.md → `handle-incident` | свой |
| 3.5.3 | `handle-incident` | Инцидент: смягчить, хронология, диагностика, коммуникация, постмортем. | восстановление + постмортем → `triage-issues` | свой |
| 3.5.4 | `triage-issues` | Разбор входящих задач и багов: тип, серьёзность, метки, следующий шаг, бриф для конвейера. | размеченный бэклог + брифы → `orbit` | Matt Pocock Skills «triage» |

## Поверх всего — включено всегда: вход, стиль, дисциплина, границы, настройка репо

### 0.1 Вход

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 0.1.1 | `orbit` | Точка входа: оценивает задачу, предлагает маршрут из 3–7 шагов по конвейеру и ведёт по нему. | маршрут из шагов → `clarify-task` | свой |

### 0.2 Установки

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 0.2.1 | `speak-plain` | Стиль всех ответов: сначала ответ, короткие фразы, точные имена, живая речь (STE на 65–70 %). | ясный короткий текст → `write-human` | ASD-STE100 «ASD-STE100» |
| 0.2.2 | `think-first` | Думать до кода: назвать допущения, минимум кода, хирургические правки, проверяемая цель. | дисциплина правок → `keep-it-small` | Karpathy Skills «karpathy-guidelines» |
| 0.2.3 | `keep-it-small` | Самое маленькое полное изменение: реюз, без спекулятивной сложности, три уровня строгости. | малый законченный diff → `cut-complexity` | Ponytail «ponytail» |
| 0.2.4 | `stay-in-scope` | Работать только в оговорённых репозиториях и действиях; всё вне — с явного согласия. | зафиксированный скоуп → `commit-clean` | свой |
| 0.2.5 | `commit-clean` | Коммиты и MR/PR по правилам команды: формат, политика AI-атрибуции, только по просьбе. | коммит / описание MR → `open-mr` | свой |
| 0.2.6 | `write-human` | Убрать машинный оттенок из текстов наружу, не меняя фактов. | живой текст → `write-update` | Humanizer «humanizer» |

### 0.3 Настройка репозитория

| Шаг | Скилл | Что делает | Выход → дальше | Основано на |
|---|---|---|---|---|
| 0.3.1 | `setup-repo` | Один раз на репо: трекер и формат коммитов, папка .orbit/, проверки до коммита, хук против опасных git-команд. | CLAUDE.md, хуки, .orbit/ → `clarify-task` | Matt Pocock Skills «setup-matt-pocock-skills, setup-pre-commit, git-guardrails-claude-code» |

## Маршруты

- **Новая фича:** `clarify-task` → `map-knowledge` → `scan-risks` → `write-spec` → `run-spec-loop` → `plan-steps` → `test-first` → `review-code` → `prove-done` → `open-mr` → `project-map`
- **Новый бэкенд-сервис:** `capture-requirements` → `design-backend` → `design-data` → `design-services` → `choose-stack` → `publish-design-docs` → `plan-steps` → `delegate-tasks` → `review-security` → `ship-k8s`
- **Чужой / легаси код:** `recall-history` → `map-knowledge` → `survey-codebase` → `explain-code` → `extract-rules` → `onboard-people` → `project-map`
- **Реверс приложения / артефакта:** `reverse-app` → `teardown-artifact` → `analyze-binary` → `recon-webapp` → `recover-api-spec` → `extract-rules` → `rebuild-clean` → `check-parity`
- **Продукт по образцу:** `teardown-product` → `mine-user-pain` → `plan-rebuild` → `rebuild-design` → `build-screens` → `build-backend` → `test-flows` → `check-parity`
- **Баг / красный CI:** `find-root-cause` → `fix-ci` → `test-first` → `prove-done` → `keep-learnings`
- **Инцидент:** `handle-incident` → `ship-k8s` → `write-runbook` → `review-observability` → `keep-learnings`
- **Объяснить / передать:** `map-knowledge` → `project-map` → `project-diagram` → `onboard-people` → `teach-topic` → `handoff-session`

## Не вошло и почему

- **claude-red** — наступательный контент; модели с safety-обучением отказываются. Защитная сторона — `review-security`, `model-threats`.
- **REA** и **Craft Anything** как инструменты — модель с ними не работает; их метод переписан в блок 1.3 Реверс-инжиниринг и `rebuild-clean`.
- Служебные скиллы разработки самих паков, ребрендинг и запуск клона в магазинах — вне задач пака.
- Anthropic docx/pdf/pptx/xlsx — лицензия не разрешает распространение.
