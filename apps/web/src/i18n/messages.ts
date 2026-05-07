/**
 * UI string dictionary — English + Portuguese (PT-PT).
 *
 * Keys use dot.namespacing for organisation but the lookup is flat — `t('foo.bar')`
 * just looks up the literal key. Pluralisation handled inline (no ICU) since we have
 * very few cases. Interpolation: `{name}` placeholders in strings, replaced via the
 * `vars` arg to `t()`.
 *
 * To add a language: add a new dictionary, add the code to the `Lang` union, and
 * extend the picker in LangContext.
 */

export type Lang = 'en' | 'pt';

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  pt: 'Português',
};

export const LANG_FLAGS: Record<Lang, string> = {
  en: '🇬🇧',
  pt: '🇵🇹',
};

type Dict = Record<string, string>;

export const en: Dict = {
  // App-wide
  'app.tagline': '980 STICKERS · 48 TEAMS · ONE ALBUM',
  'app.album_completion': 'Album completion',
  'app.cromos_world_cup_2026': 'CROMOS · WORLD CUP 2026',

  // Auth / onboarding
  'auth.welcome_back': 'WELCOME BACK',
  'auth.start_your_album': 'START YOUR ALBUM',
  'auth.name': 'NAME',
  'auth.email': 'EMAIL',
  'auth.password': 'PASSWORD',
  'auth.sign_in': 'SIGN IN',
  'auth.create_account': 'CREATE ACCOUNT',
  'auth.have_account': 'Already have an account? Sign in',
  'auth.no_account': 'New here? Create an account',
  'auth.continue_with_google': 'Continue with Google',
  'auth.or': 'or',
  'auth.sign_out': 'Sign out',
  'auth.error.bad_credentials': 'Wrong email or password',
  'auth.error.email_taken': 'That email is already in use',
  'auth.error.name_required': 'Please enter your name',
  'auth.error.generic': 'Something went wrong — please try again',

  // Tabs
  'tab.collection': 'Collection',
  'tab.groups': 'Groups',
  'tab.trades': 'Trades',
  'tab.stats': 'Stats',

  // Collection
  'collection.filter.all': 'All',
  'collection.filter.owned': 'Owned',
  'collection.filter.missing': 'Missing',
  'collection.filter.duplicates': 'Duplicates',
  'collection.bulk': 'Bulk',
  'collection.bulk_active': '✓ Bulk',
  'collection.bulk_hint': 'Bulk mode: tap many stickers in sequence to mark owned',
  'collection.search_placeholder': 'Search sticker number...',
  'collection.search_aria': 'Search by sticker number',
  'collection.stat.owned': 'Owned',
  'collection.stat.missing': 'Missing',
  'collection.stat.dups': 'Dups',
  'collection.stat.done': 'Done',

  // Sticker count editor
  'sticker.title': 'STICKER #{n}',
  'sticker.close': 'CLOSE',
  'sticker.decrement': 'Decrement',
  'sticker.increment': 'Increment',
  'sticker.count_aria': 'Count',
  'sticker.preset.none': 'None',
  'sticker.preset.owned': 'Owned',
  'sticker.save': 'SAVE',

  // Groups list
  'groups.your_groups': 'YOUR GROUPS',
  'groups.new': '+ NEW',
  'groups.new_sub': 'Create a group',
  'groups.join': 'JOIN',
  'groups.join_sub': 'Use invite code',
  'groups.member_count_one': '1 member',
  'groups.member_count_other': '{n} members',
  'groups.code_label': 'CODE {code}',
  'groups.empty': 'No groups yet. Create one or join with a friend\'s invite code.',
  'groups.loading': 'Loading…',

  // Group create / join modals
  'modal.new_group_title': 'NEW GROUP',
  'modal.group_name_placeholder': 'Group name (e.g. Café Friends)',
  'modal.create': 'CREATE',
  'modal.join_group_title': 'JOIN A GROUP',
  'modal.code_placeholder': '6-CHAR CODE',
  'modal.join': 'JOIN',
  'modal.cancel': 'Cancel',
  'modal.error.group_not_found': 'No group with that code',
  'modal.error.invalid_code': 'Codes are 6 letters/numbers',
  'modal.error.generic': 'Something went wrong',

  // Group detail
  'group.back': '← Groups',
  'group.leaderboard': 'LEADERBOARD',
  'group.trade_suggestions': 'TRADE SUGGESTIONS',
  'group.no_trades': 'No balanced trades yet — get more duplicates and check back!',
  'group.you_tag': 'YOU',
  'group.owned_dups': '{owned} owned · {dups} dups',
  'group.leave': 'Leave group',
  'group.delete': 'Delete group',
  'group.confirm_leave': 'Leave this group?',
  'group.confirm_delete': 'Delete this group for everyone? This cannot be undone.',
  'group.trade_each': '{n} EACH',
  'group.gives': 'GIVES',
  'group.copied': 'COPIED!',
  'group.copy_code_aria': 'Invite code {code}, click to copy',

  // Direct trades
  'trades.title': 'DIRECT TRADES',
  'trades.label_group': 'GROUP',
  'trades.label_friend': 'FRIEND',
  'trades.no_others': 'No other members in this group yet.',
  'trades.you_can_give': 'YOU CAN GIVE',
  'trades.they_can_give': 'THEY CAN GIVE',
  'trades.your_dups': 'Your duplicates they\'re missing',
  'trades.their_dups': 'Their duplicates you\'re missing',
  'trades.sticker_count': '{n} STICKERS',
  'trades.empty_balanced': 'Nothing balanced here yet.',
  'trades.pick_group_hint': 'Pick a group above to see who you can trade with.',

  // Stats
  'stats.your_progress': 'YOUR PROGRESS',
  'stats.x_of_y': '{owned} / {total} stickers',
  'stats.block.owned': 'Owned',
  'stats.block.missing': 'Missing',
  'stats.block.duplicates': 'Duplicates',
  'stats.block.total': 'Total',
  'stats.by_category': 'BY CATEGORY',
  'stats.missing_count': 'MISSING ({n})',
  'stats.show_list': 'Show list',
  'stats.hide_list': 'Hide list',
  'stats.copy_all': 'Copy all',
  'stats.copied': 'Copied!',
  'stats.complete': 'None — you have them all!',
};

export const pt: Dict = {
  // App-wide
  'app.tagline': '980 CROMOS · 48 EQUIPAS · UMA CADERNETA',
  'app.album_completion': 'Caderneta completa',
  'app.cromos_world_cup_2026': 'CROMOS · MUNDIAL 2026',

  // Auth / onboarding
  'auth.welcome_back': 'BEM-VINDO DE VOLTA',
  'auth.start_your_album': 'COMEÇA A TUA CADERNETA',
  'auth.name': 'NOME',
  'auth.email': 'EMAIL',
  'auth.password': 'PALAVRA-PASSE',
  'auth.sign_in': 'ENTRAR',
  'auth.create_account': 'CRIAR CONTA',
  'auth.have_account': 'Já tens conta? Entrar',
  'auth.no_account': 'Novo aqui? Cria conta',
  'auth.continue_with_google': 'Continuar com Google',
  'auth.or': 'ou',
  'auth.sign_out': 'Sair',
  'auth.error.bad_credentials': 'Email ou palavra-passe errados',
  'auth.error.email_taken': 'Esse email já está em uso',
  'auth.error.name_required': 'Por favor, indica o teu nome',
  'auth.error.generic': 'Algo correu mal — tenta outra vez',

  // Tabs
  'tab.collection': 'Caderneta',
  'tab.groups': 'Grupos',
  'tab.trades': 'Trocas',
  'tab.stats': 'Estatísticas',

  // Collection
  'collection.filter.all': 'Tudo',
  'collection.filter.owned': 'Tenho',
  'collection.filter.missing': 'Faltam',
  'collection.filter.duplicates': 'Repetidos',
  'collection.bulk': 'Massa',
  'collection.bulk_active': '✓ Massa',
  'collection.bulk_hint': 'Modo massa: toca em vários cromos em sequência para marcar como teus',
  'collection.search_placeholder': 'Procurar nº de cromo...',
  'collection.search_aria': 'Procurar por número de cromo',
  'collection.stat.owned': 'Tenho',
  'collection.stat.missing': 'Faltam',
  'collection.stat.dups': 'Reps.',
  'collection.stat.done': 'Feito',

  // Sticker count editor
  'sticker.title': 'CROMO #{n}',
  'sticker.close': 'FECHAR',
  'sticker.decrement': 'Diminuir',
  'sticker.increment': 'Aumentar',
  'sticker.count_aria': 'Quantidade',
  'sticker.preset.none': 'Nenhum',
  'sticker.preset.owned': 'Tenho',
  'sticker.save': 'GUARDAR',

  // Groups list
  'groups.your_groups': 'OS TEUS GRUPOS',
  'groups.new': '+ NOVO',
  'groups.new_sub': 'Criar um grupo',
  'groups.join': 'ENTRAR',
  'groups.join_sub': 'Usar código',
  'groups.member_count_one': '1 membro',
  'groups.member_count_other': '{n} membros',
  'groups.code_label': 'CÓDIGO {code}',
  'groups.empty': 'Ainda não tens grupos. Cria um ou entra com o código de um amigo.',
  'groups.loading': 'A carregar…',

  // Group create / join modals
  'modal.new_group_title': 'NOVO GRUPO',
  'modal.group_name_placeholder': 'Nome do grupo (ex. Amigos do Café)',
  'modal.create': 'CRIAR',
  'modal.join_group_title': 'ENTRAR NUM GRUPO',
  'modal.code_placeholder': 'CÓDIGO DE 6 LETRAS',
  'modal.join': 'ENTRAR',
  'modal.cancel': 'Cancelar',
  'modal.error.group_not_found': 'Não existe grupo com esse código',
  'modal.error.invalid_code': 'O código tem 6 letras/números',
  'modal.error.generic': 'Algo correu mal',

  // Group detail
  'group.back': '← Grupos',
  'group.leaderboard': 'CLASSIFICAÇÃO',
  'group.trade_suggestions': 'SUGESTÕES DE TROCA',
  'group.no_trades': 'Ainda não há trocas equilibradas — arranja mais repetidos e vem outra vez!',
  'group.you_tag': 'TU',
  'group.owned_dups': '{owned} colados · {dups} reps.',
  'group.leave': 'Sair do grupo',
  'group.delete': 'Apagar grupo',
  'group.confirm_leave': 'Sair deste grupo?',
  'group.confirm_delete': 'Apagar este grupo para toda a gente? Isto não se desfaz.',
  'group.trade_each': '{n} CADA',
  'group.gives': 'DÁ',
  'group.copied': 'COPIADO!',
  'group.copy_code_aria': 'Código de convite {code}, clica para copiar',

  // Direct trades
  'trades.title': 'TROCAS DIRETAS',
  'trades.label_group': 'GRUPO',
  'trades.label_friend': 'AMIGO',
  'trades.no_others': 'Ainda não há outros membros neste grupo.',
  'trades.you_can_give': 'PODES DAR',
  'trades.they_can_give': 'ELE/A PODE DAR',
  'trades.your_dups': 'Os teus repetidos que faltam a ele/a',
  'trades.their_dups': 'Os repetidos dele/a que te faltam',
  'trades.sticker_count': '{n} CROMOS',
  'trades.empty_balanced': 'Ainda nada de equilibrado por aqui.',
  'trades.pick_group_hint': 'Escolhe um grupo acima para veres com quem podes trocar.',

  // Stats
  'stats.your_progress': 'O TEU PROGRESSO',
  'stats.x_of_y': '{owned} / {total} cromos',
  'stats.block.owned': 'Colados',
  'stats.block.missing': 'Faltam',
  'stats.block.duplicates': 'Repetidos',
  'stats.block.total': 'Total',
  'stats.by_category': 'POR EQUIPA',
  'stats.missing_count': 'FALTAM ({n})',
  'stats.show_list': 'Mostrar lista',
  'stats.hide_list': 'Ocultar lista',
  'stats.copy_all': 'Copiar tudo',
  'stats.copied': 'Copiado!',
  'stats.complete': 'Nenhum — tens todos!',
};

export const DICTS: Record<Lang, Dict> = { en, pt };
