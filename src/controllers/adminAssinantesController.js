import AssinanteModel from '../models/assinanteModel.js';

const STATUS_OPTIONS = ['trial', 'ativo', 'vencido', 'cancelado', 'bloqueado'];
const BILLING_OPTIONS = ['', 'mensal', 'anual'];
const PRODUCT_OPTIONS = [
  { value: 'BOLINHAS', label: 'Bolinhas' },
  { value: 'FIGURINHAS', label: 'Consignados' },
  { value: 'PELUCIAS', label: 'Pelucias' }
];

const normalizeDateTime = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Informe datas validas.');
  }

  return date;
};

const normalizeText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

class AdminAssinantesController {
  index = async (req, res) => {
    try {
      const assinantes = await AssinanteModel.listForAdmin();

      return res.render('pages/admin/assinantes', {
        title: 'Assinantes',
        usuario: req.user,
        assinantes,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Erro ao listar assinantes:', error);
      return res.status(500).send('Erro ao listar assinantes.');
    }
  };

  edit = async (req, res) => {
    try {
      const assinante = await AssinanteModel.findAdminById(req.params.id);

      if (!assinante) {
        return res.status(404).send('Assinante nao encontrado.');
      }

      return res.render('pages/admin/editarAssinante', {
        title: 'Editar Assinante',
        usuario: req.user,
        assinante,
        statusOptions: STATUS_OPTIONS,
        billingOptions: BILLING_OPTIONS,
        productOptions: PRODUCT_OPTIONS,
        formatDateInput,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Erro ao carregar assinante:', error);
      return res.status(500).send('Erro ao carregar assinante.');
    }
  };

  update = async (req, res) => {
    try {
      const id = Number(req.params.id);
      const statusAssinatura = String(req.body.status_assinatura || '').trim();
      const tipoCobranca = String(req.body.tipo_cobranca || '').trim();

      if (!STATUS_OPTIONS.includes(statusAssinatura)) {
        throw new Error('Status da assinatura invalido.');
      }

      if (!BILLING_OPTIONS.includes(tipoCobranca)) {
        throw new Error('Tipo de cobranca invalido.');
      }

      const produtosHabilitados = Array.isArray(req.body.produtos_habilitados)
        ? req.body.produtos_habilitados
        : [req.body.produtos_habilitados].filter(Boolean);

      if (!produtosHabilitados.length) {
        throw new Error('Selecione pelo menos um produto para este assinante.');
      }

      const assinanteAtual = await AssinanteModel.findAdminById(id);
      if (!assinanteAtual) {
        return res.status(404).send('Assinante nao encontrado.');
      }

      const isEditingSelf = Number(assinanteAtual.user_id) === Number(req.user.user_id);
      if (isEditingSelf && statusAssinatura === 'bloqueado') {
        throw new Error('Voce nao pode bloquear o proprio usuario administrador.');
      }

      await AssinanteModel.updateFromAdmin(id, {
        status_assinatura: statusAssinatura,
        tipo_cobranca: tipoCobranca || null,
        trial_fim: normalizeDateTime(req.body.trial_fim),
        data_ativacao: normalizeDateTime(req.body.data_ativacao),
        data_vencimento: normalizeDateTime(req.body.data_vencimento),
        data_limite_exclusao: normalizeDateTime(req.body.data_limite_exclusao),
        produtos_habilitados: produtosHabilitados,
        gateway_customer_id: normalizeText(req.body.gateway_customer_id),
        gateway_subscription_id: normalizeText(req.body.gateway_subscription_id)
      });

      return res.redirect(`/admin/assinantes/${id}/edit?success=${encodeURIComponent('Assinante atualizado com sucesso.')}`);
    } catch (error) {
      console.error('Erro ao atualizar assinante:', error);
      const message = error.message || 'Erro ao atualizar assinante.';
      return res.redirect(`/admin/assinantes/${req.params.id}/edit?error=${encodeURIComponent(message)}`);
    }
  };
}

export default new AdminAssinantesController();
