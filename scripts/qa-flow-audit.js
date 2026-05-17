import { readFile } from 'node:fs/promises';

const checks = [];

const addCheck = (name, file, predicate, hint) => {
  checks.push({ name, file, predicate, hint });
};

const includesAll = (...needles) => (content) =>
  needles.every((needle) => content.includes(needle));

const excludesAll = (...needles) => (content) =>
  needles.every((needle) => !content.includes(needle));

const allOf = (...predicates) => (content) =>
  predicates.every((predicate) => predicate(content));

const matchesAll = (...patterns) => (content) =>
  patterns.every((pattern) => pattern.test(content));

addCheck(
  'Admin de assinantes exige perfil SaaS admin',
  'src/routes/adminAssinantesRoutes.js',
  includesAll('router.use(requireSaasAdmin);'),
  'Sem requireSaasAdmin, usuario comum pode tentar acessar area administrativa.'
);

addCheck(
  'Admin de interessados exige perfil SaaS admin',
  'src/routes/adminInteressadosRoutes.js',
  includesAll('router.use(requireSaasAdmin);'),
  'Sem requireSaasAdmin, a lista de leads e e-mails fica exposta.'
);

addCheck(
  'Rotas operacionais bloqueiam assinatura sem escrita',
  'src/routes/rotasRoutes.js',
  matchesAll(
    /router\.post\('\/operacional\/iniciar',\s*requireWritableSubscription,/,
    /router\.post\('\/pontos\/:rotaPontoId\/chegada',\s*requireWritableSubscription,/
  ),
  'Iniciar rota e registrar chegada alteram estado operacional.'
);

addCheck(
  'Formulario publico de interesse tem rate limit',
  'src/routes/interessadosRoutes.js',
  matchesAll(/contactRateLimiter/, /router\.post\('\/enviar-contato',\s*contactRateLimiter,/),
  'Sem limite, o formulario publico pode sofrer spam automatizado.'
);

addCheck(
  'Google OAuth nao cria trial publico quando cadastro esta fechado',
  'src/models/loginLogoutModel.js',
  includesAll('allowCreateUser', 'auth_provider', "usuario.auth_provider === 'google'", 'google_signup_disabled'),
  'Login com Google nao pode reabrir contas criadas automaticamente quando o cadastro normal esta fechado.'
);

addCheck(
  'Google OAuth nao usa excecao localhost para criar conta',
  'src/controllers/loginLogout.js',
  allOf(
    includesAll('allowCreateUser: false', 'failGoogleLogin(res, message)', 'res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions())'),
    excludesAll('allowCreateUser: isPublicAuthEnabled()', 'allowCreateUser: isPublicAuthEnabled() || isLocalhostRequest(req)')
  ),
  'O callback Google deve validar a conta escolhida, limpar cookie antigo em falhas e nunca criar usuario automaticamente.'
);

addCheck(
  'Inicio do Google OAuth nao reaproveita sessao ativa',
  'src/controllers/loginLogout.js',
  allOf(
    includesAll('googleLogin(req, res)', 'res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions())', "prompt: 'select_account'"),
    excludesAll("googleLogin(req, res) {\r\n        if (req.user)", "googleLogin(req, res) {\n        if (req.user)")
  ),
  'Clicar em Entrar com Google precisa validar a conta escolhida, nao reaproveitar cookie anterior.'
);

addCheck(
  'Sessoes antigas de contas Google automaticas sao bloqueadas',
  'src/middleware/subscriptionStatus.js',
  allOf(
    includesAll("authProvider === 'google'", 'clearAuthCookie', 'Conta criada automaticamente pelo Google nao esta autorizada'),
    excludesAll('!isPublicAuthEnabled()', 'PUBLIC_AUTH_ENABLED')
  ),
  'Contas Google criadas antes da correcao nao podem continuar usando cookie valido.'
);

addCheck(
  'Sessoes com assinante removido sao invalidadas',
  'src/middleware/subscriptionStatus.js',
  includesAll("if (!assinante)", 'Sessao invalida. Faca login novamente.', 'clearAuthCookie'),
  'JWT antigo de usuario removido nao pode continuar acessando o sistema.'
);

addCheck(
  'JWT de sessao e reconciliado com o banco',
  'src/middleware/isAuthenticated.js',
  allOf(
    includesAll('findSessionUser', 'INNER JOIN assinantes', "sessionUser.auth_provider === 'google'", 'clearInvalidSession(res)'),
    excludesAll('PUBLIC_AUTH_ENABLED')
  ),
  'Cookie antigo nao pode autenticar usuario removido ou conta Google automatica bloqueada.'
);

addCheck(
  'Bypass localhost do cadastro nao vale em producao',
  'src/routes/loginLogoutRoutes.js',
  includesAll("process.env.NODE_ENV !== 'production' && isLocalhostRequest(req)", 'requirePublicRegistrationAccess'),
  'Header Host localhost nao pode abrir cadastro publico em producao.'
);

addCheck(
  'Admin SaaS nao usa fallback silencioso em producao',
  'src/utilities/saasAdmin.js',
  includesAll("!rawConfigured && process.env.NODE_ENV === 'production'", 'return [];'),
  'Em producao, admin precisa ser configurado explicitamente por SAAS_ADMIN_USER_IDS.'
);

addCheck(
  'Express confia no proxy para rate limit em producao',
  'app.js',
  includesAll("app.set('trust proxy', 1);"),
  'Em deploy atras de proxy, IP incorreto enfraquece rate limit e logs.'
);

addCheck(
  'Cache de assets publicos nao prende versao antiga por 30 dias',
  'app.js',
  includesAll("maxAge: '1h'"),
  'Cache muito longo esconde correcoes de CSS/JS em producao.'
);

addCheck(
  'Cadastro respeita produtos escolhidos no trial',
  'src/controllers/loginLogout.js',
  includesAll('normalizeSelectedProdutos', 'produtos_habilitados'),
  'No trial o usuario pode escolher produtos; no pago quem libera e o admin.'
);

addCheck(
  'Cadastro exige plano comercial antes de criar assinante',
  'src/controllers/loginLogout.js',
  includesAll("return res.redirect('/precos');", 'Escolha um plano comercial antes de criar sua conta.', 'plano_codigo: planoSelecionado.codigo'),
  'Cadastro publico sem plano gera assinante sem valor mensal e quebra cobranca futura.'
);

addCheck(
  'Edicao de produtos da assinatura continua restrita ao trial ou admin',
  'src/controllers/assinaturaController.js',
  includesAll("req.user?.status_assinatura === 'trial'", 'isSaasAdminUser(req.user)', 'As ferramentas contratadas seguem o plano atual'),
  'Assinatura paga deve ter produtos controlados pelo admin.'
);

for (const [name, file] of [
  ['Bolinha valida visita da rota antes de vincular produto', 'src/controllers/bolinhaController.js'],
  ['Consignado valida visita da rota antes de vincular produto', 'src/controllers/consignadosController.js'],
  ['Pelucia valida visita da rota antes de vincular produto', 'src/controllers/peluciasController.js']
]) {
  addCheck(
    name,
    file,
    includesAll('VisitasModel.findVisitaById', 'visitaDaRota.estabelecimento_id', 'visitaDaRota.rota_ponto_id'),
    'Campos escondidos do formulario nao podem vincular produto a visita de outro ponto.'
  );
}

for (const [name, file] of [
  ['Bolinha nao exclui sangria ligada a visita guiada', 'src/models/BolinhasModel.js'],
  ['Consignado nao exclui sangria ligada a visita guiada', 'src/models/consignadosModel.js'],
  ['Pelucia nao exclui sangria ligada a visita guiada', 'src/models/peluciasModel.js']
]) {
  addCheck(
    name,
    file,
    includesAll('AND NOT EXISTS', 'FROM visita_produtos', 'assinante_id = $2'),
    'Excluir sangria ja usada por visita quebra historico da rota.'
  );
}

for (const [name, file] of [
  ['Bolinha nao troca estabelecimento de sangria ligada a visita', 'src/controllers/bolinhaController.js'],
  ['Consignado nao troca estabelecimento de sangria ligada a visita', 'src/controllers/consignadosController.js'],
  ['Pelucia nao troca estabelecimento de sangria ligada a visita', 'src/controllers/peluciasController.js']
]) {
  addCheck(
    name,
    file,
    includesAll('findProdutoBySangria', 'nao pode trocar de estabelecimento'),
    'Editar sangria vinculada nao pode corromper o historico da visita guiada.'
  );
}

for (const [name, file] of [
  ['Consignado protege estoque futuro ao editar sangria', 'src/controllers/consignadosController.js'],
  ['Pelucia protege estoque futuro ao editar sangria', 'src/controllers/peluciasController.js']
]) {
  addCheck(
    name,
    file,
    includesAll('hasLaterSangria', 'getPreviousSangriaBeforeDate', 'estoque futuro'),
    'Editar sangria antiga nao pode deixar registros futuros de estoque incoerentes.'
  );
}

for (const [name, file] of [
  ['Bolinha recalcula receita consolidada quando mexe em mes antigo', 'src/controllers/bolinhaController.js'],
  ['Consignado recalcula receita consolidada quando mexe em mes antigo', 'src/controllers/consignadosController.js'],
  ['Pelucia recalcula receita consolidada quando mexe em mes antigo', 'src/controllers/peluciasController.js']
]) {
  addCheck(
    name,
    file,
    includesAll('recalculateConsolidatedRevenueForDates'),
    'Editar/excluir sangria antiga precisa atualizar receita consolidada.'
  );
}

addCheck(
  'Consolidacao mensal remove receita quando total vira zero e limpa duplicados',
  'src/services/monthlyRevenueConsolidation.js',
  includesAll('deleteConsolidatedRevenueEntry', 'deleteConsolidatedRevenueDuplicates', 'targetMonthKey >= currentMonthKey'),
  'Mes fechado precisa refletir edicoes antigas sem duplicar lancamentos do sistema.'
);

addCheck(
  'Lancamentos validam tipo, forma, parcelas, valor e produto liberado',
  'src/controllers/lancamentoController.js',
  includesAll('TIPOS_POR_MOVIMENTO', 'FORMAS_PAGAMENTO', 'Produto nao liberado para este assinante.', 'parcelas < 1 || parcelas > 120', 'valorNumerico <= 0'),
  'O servidor nao pode confiar nas opcoes visiveis do formulario.'
);

addCheck(
  'Lancamentos validam datas antes de gravar',
  'src/controllers/lancamentoController.js',
  includesAll('normalizeDateOnly', 'dataNormalizada', 'Data de vencimento'),
  'Data invalida nao pode virar erro 500 nem entrar no banco por POST manual.'
);

addCheck(
  'Receita consolidada usa trava por assinante produto e mes',
  'src/models/lancamentoModel.js',
  includesAll('withConsolidatedRevenueLock', 'pg_advisory_xact_lock', 'receita-consolidada'),
  'Duas sangrias simultaneas no mesmo mes nao podem criar duas entradas consolidadas.'
);

addCheck(
  'Backend bloqueia submissao duplicada em andamento',
  'app.js',
  includesAll('preventDuplicateSubmission', 'app.use(preventDuplicateSubmission())'),
  'Duplo clique ou POST repetido nao pode criar registros duplicados.'
);

addCheck(
  'Formulario global trava reenvio duplo sem quebrar AJAX',
  'src/views/partials/head.ejs',
  includesAll("form.dataset.submitting === 'true'", 'event.defaultPrevented', "submitter.disabled = true"),
  'Clique duplo no navegador deve ser bloqueado, mas formularios que usam preventDefault precisam continuar funcionando.'
);

addCheck(
  'Visitas guiadas validam produto pendente antes de criar sangria',
  'src/models/visitasModel.js',
  includesAll('findProdutoByVisita', "AND status = 'pendente'", 'pg_advisory_xact_lock'),
  'Campos ocultos adulterados ou reenvio nao podem criar sangria orfa ou trocar produto ja registrado.'
);

addCheck(
  'Inicio de rota valida pontos ativos e remove duplicados',
  'src/controllers/rotasController.js',
  includesAll('normalizeRoutePointIds', 'findActiveRoutePointIds', 'pontosNormalizados.length > 100'),
  'POST manual nao pode iniciar rota com ponto duplicado, inativo ou fora do produto selecionado.'
);

addCheck(
  'Produtos disponiveis falham fechado se assinatura nao carregar',
  'src/models/estabelecimentoModel.js',
  includesAll('bolinhas: false', 'figurinhas: false', 'pelucias: false'),
  'Erro ao consultar assinatura nao deve liberar todos os modulos por engano.'
);

addCheck(
  'Estabelecimento nao remove produto com historico operacional',
  'src/controllers/estabelecimentoController.js',
  includesAll('assertProductHistoryIsPreserved', 'getProductUsageSummary', 'jÃ¡ possui histÃ³rico de operaÃ§Ã£o'),
  'Remover produto de ponto com sangrias faz registros sumirem das telas filtradas pelo produto atual.'
);

addCheck(
  'Estabelecimento nao reescreve estoque inicial com historico',
  'src/controllers/estabelecimentoController.js',
  includesAll('assertInitialValuesAreNotRewritten', 'quantidade inicial de consignados', 'dados iniciais de pelÃºcias'),
  'Alterar leitura ou estoque inicial depois de movimentos reais corrompe a base de calculo.'
);

addCheck(
  'Assinatura nao remove ferramenta com historico do assinante',
  'src/controllers/assinaturaController.js',
  includesAll('assertEnabledProductsPreserveHistory', 'getTenantProductUsageSummary', 'ja existe historico cadastrado'),
  'Remover ferramenta da assinatura com dados existentes pode esconder modulos e historico do cliente.'
);

addCheck(
  'Admin nao remove ferramenta com historico do assinante',
  'src/controllers/adminAssinantesController.js',
  includesAll('assertEnabledProductsPreserveHistory', 'getTenantProductUsageSummary', 'ja possui historico nessa ferramenta'),
  'Mesmo no admin, remover produto contratado com dados existentes pode deixar o assinante sem acesso ao proprio historico.'
);

addCheck(
  'Admin valida ID data dinheiro e produtos antes de alterar assinatura',
  'src/controllers/adminAssinantesController.js',
  allOf(
    includesAll('parsePositiveId', 'normalizeSelectedProdutos', 'VALID_PRODUCT_VALUES'),
    matchesAll(/\\d\{4\}-\\d\{2\}-\\d\{2\}/, /\\d\+\(\\\.\\d\{1,2\}\)\?/)
  ),
  'Tela administrativa tambem precisa bloquear POST manual com ID invalido, data impossivel, valor negativo/letras e produto adulterado.'
);

addCheck(
  'Busca global valida tamanho e caracteres do termo',
  'src/controllers/searchController.js',
  includesAll('normalizeSearchTerm', 'SearchValidationError', 'req.body?.termo'),
  'Busca com termo vazio, enorme ou com caracteres suspeitos nao deve virar consulta pesada ou erro 500.'
);

addCheck(
  'Buscas no banco tem limite de resultados',
  'src/models/lancamentoModel.js',
  includesAll('LIMIT 100', 'ORDER BY COALESCE(vencimento, data) DESC'),
  'Busca ampla nao deve devolver volume sem limite para a tela.'
);

addCheck(
  'Pagamentos bloqueiam operacoes simultaneas por assinante',
  'src/controllers/pagamentoController.js',
  includesAll('acquirePaymentOperationLock', 'prepare-or-switch', 'Ja existe uma operacao de pagamento em andamento'),
  'Cliques concorrentes em iniciar/trocar pagamento podem criar ou cancelar cobrancas em ordem confusa.'
);

addCheck(
  'Dados de cobranca limitam tamanho e caracteres perigosos',
  'src/controllers/pagamentoController.js',
  includesAll('billingNome.length > 150', '/[<>]/.test(billingNome)', 'billingEmail.length > 150'),
  'Dados de cobranca enviados manualmente nao devem aceitar nomes enormes ou caracteres suspeitos.'
);

addCheck(
  'Admin comunidade sanitiza retorno e IDs',
  'src/controllers/adminComunidadeController.js',
  includesAll('getRedirectBack', 'new URL', "parsed.pathname.startsWith('/comunidade')", 'parsePositiveId'),
  'Referer externo nao deve virar redirect de admin, e IDs invalidos nao devem chegar ao model.'
);

addCheck(
  'Estabelecimento nao encerra ponto com visita aberta',
  'src/controllers/estabelecimentoController.js',
  includesAll('hasOpenOperationalVisit', 'visita em andamento', 'Finalize ou cancele'),
  'Encerrar ponto durante rota em andamento pode quebrar o fluxo operacional do usuario em campo.'
);

addCheck(
  'Banco tem migration com constraints operacionais',
  'migrations/017_add_operational_safety_constraints.sql',
  includesAll(
    'chk_sangrias_bolinha_non_negative_values',
    'chk_sangrias_consignados_non_negative_values',
    'chk_sangrias_pelucias_non_negative_values',
    'chk_lancamentos_safe_numbers',
    'chk_visitas_status_values',
    'NOT VALID'
  ),
  'Validacao precisa existir tambem no banco para proteger novos dados se algum endpoint falhar.'
);

addCheck(
  'Webhook Asaas tem auditoria local de cenarios',
  'scripts/qa-webhook-normalizer.js',
  includesAll('PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'SUBSCRIPTION_DELETED', 'valor invalido vira nulo'),
  'Eventos de pagamento precisam de simulacao local para evitar ativacao indevida por evento malformado.'
);

addCheck(
  'Imagem do carrossel do painel usa ajuste dedicado',
  'src/views/pages/homepage.ejs',
  includesAll('vm-dashboard-slide-wide-panel', 'painel-vendmaster.webp'),
  'O slide do painel tem proporcao diferente e precisa de classe propria.'
);

addCheck(
  'CSS do slide do painel preenche o quadro sem cortar laterais',
  'public/css/homepage.css',
  includesAll('.vm-dashboard-slide-wide-panel', 'object-fit: fill !important'),
  'Sem regra dedicada, a imagem alterna entre corte lateral e sobra branca.'
);

const run = async () => {
  const results = [];

  for (const check of checks) {
    const content = await readFile(check.file, 'utf8');
    const passed = check.predicate(content);
    results.push({ ...check, passed });
  }

  const failed = results.filter((result) => !result.passed);

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`[QA] ${status} ${result.name}`);
    if (!result.passed) {
      console.log(`     Arquivo: ${result.file}`);
      console.log(`     Risco: ${result.hint}`);
    }
  }

  console.log(`\n[QA] ${results.length - failed.length}/${results.length} checks passaram.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('[QA] Erro ao executar auditoria:', error);
  process.exitCode = 1;
});
