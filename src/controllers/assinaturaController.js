import AssinanteModel from '../models/assinanteModel.js';
import { normalizeSelectedProdutos } from '../utilities/produtoUtils.js';
import { isSaasAdminUser } from '../utilities/saasAdmin.js';

import {
  getGatewayConfig,
  isGatewayConfigured
} from '../services/paymentGatewayService.js';

const PRODUCT_OPTIONS = [
  { value: 'BOLINHAS', label: 'Bolinhas', className: 'modern-checkbox-green' },
  { value: 'CONSIGNADOS', label: 'Consignados', className: 'modern-checkbox-blue' },
  { value: 'PELUCIAS', label: 'Pelúcias', className: 'modern-checkbox-violet' }
];

function canAccessProductSettings(req, res) {
  return Boolean(
    req.user?.status_assinatura === 'trial'
    || res.locals?.isSaasAdmin
    || isSaasAdminUser(req.user)
  );
}

class AssinaturaController {
  status = async (req, res) => {
    try {
      const assinante = await AssinanteModel.findById(req.user.assinante_id);

      if (!assinante) {
        return res.status(404).render('pages/404', {
          title: 'Assinatura não encontrada - VendMaster'
        });
      }

      return res.render('pages/assinatura/status', {
        title: 'Status da Assinatura',
        usuario: req.user,
        assinante,
        productOptions: PRODUCT_OPTIONS,
        canManageProducts: canAccessProductSettings(req, res),
        gatewayConfigured: isGatewayConfigured(),
        gatewayConfig: getGatewayConfig()
      });
    } catch (error) {
      console.error('Erro ao carregar status da assinatura:', error);
      return res.status(500).send('Erro ao carregar status da assinatura.');
    }
  };

  editProdutos = async (req, res) => {
    try {
      if (!canAccessProductSettings(req, res)) {
        return res.redirect('/assinatura/status');
      }

      const assinante = await AssinanteModel.findById(req.user.assinante_id);

      if (!assinante) {
        return res.status(404).render('pages/404', {
          title: 'Assinatura não encontrada - VendMaster'
        });
      }

      return res.render('pages/assinatura/produtos', {
        title: 'Ferramentas da Assinatura',
        usuario: req.user,
        assinante,
        productOptions: PRODUCT_OPTIONS,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Erro ao carregar ferramentas da assinatura:', error);
      return res.status(500).send('Erro ao carregar ferramentas da assinatura.');
    }
  };

  updateProdutos = async (req, res) => {
    try {
      if (!canAccessProductSettings(req, res)) {
        throw new Error('As ferramentas contratadas seguem o plano atual e não podem ser alteradas por esta tela.');
      }

      const produtos = normalizeSelectedProdutos(
        Array.isArray(req.body.produtos_habilitados)
          ? req.body.produtos_habilitados
          : [req.body.produtos_habilitados].filter(Boolean)
      );

      if (!produtos.length) {
        throw new Error('Selecione pelo menos uma ferramenta para a sua operação.');
      }

      await AssinanteModel.updateFromAdmin(req.user.assinante_id, {
        produtos_habilitados: produtos
      });

      return res.redirect('/assinatura/produtos?success=Ferramentas atualizadas com sucesso.');
    } catch (error) {
      const message = error.message || 'Erro ao atualizar ferramentas.';
      return res.redirect(`/assinatura/produtos?error=${encodeURIComponent(message)}`);
    }
  };
}

export default new AssinaturaController();