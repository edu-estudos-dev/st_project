import { readFile } from 'node:fs/promises';

const checks = [];

const addCheck = (name, file, predicate, hint) => {
  checks.push({ name, file, predicate, hint });
};

const includesAll = (...needles) => (content) =>
  needles.every((needle) => content.includes(needle));

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
  'src/controllers/loginLogout.js',
  includesAll('allowCreateUser', 'PUBLIC_AUTH_ENABLED', 'google_signup_disabled'),
  'Login com Google nao pode virar cadastro publico quando o cadastro normal esta fechado.'
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
  'Produtos disponiveis falham fechado se assinatura nao carregar',
  'src/models/estabelecimentoModel.js',
  includesAll('bolinhas: false', 'figurinhas: false', 'pelucias: false'),
  'Erro ao consultar assinatura nao deve liberar todos os modulos por engano.'
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
