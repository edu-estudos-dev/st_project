import AssinanteModel from '../models/assinanteModel.js';
import { normalizeSelectedProdutos } from '../utilities/produtoUtils.js';

import {
  getGatewayConfig,
  isGatewayConfigured
} from '../services/paymentGatewayService.js';

const PRODUCT_OPTIONS = [
  { value: 'BOLINHAS', label: 'Bolinhas', className: 'modern-checkbox-green' },
  { value: 'CONSIGNADOS', label: 'Consignados', className: 'modern-checkbox-blue' },
  { value: 'PELUCIAS', label: 'Pelúcias', className: 'modern-checkbox-violet' }
];

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
      const assinante = await AssinanteModel.findById(req.user.assinante_id);

      return res.render('pages/assinatura/produtos', {
        title: 'Produtos da Operação',
        usuario: req.user,
        assinante,
        productOptions: PRODUCT_OPTIONS,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Erro ao carregar produtos da assinatura:', error);
      return res.status(500).send('Erro ao carregar produtos da assinatura.');
    }
  };

  updateProdutos = async (req, res) => {
    try {
      if (req.user?.status_assinatura !== 'trial') {
        throw new Error('As ferramentas contratadas são alteradas pelo administrador após a escolha do plano.');
      }

      const produtos = normalizeSelectedProdutos(
        Array.isArray(req.body.produtos_habilitados)
          ? req.body.produtos_habilitados
          : [req.body.produtos_habilitados].filter(Boolean)
      );

      if (!produtos.length) {
        throw new Error('Selecione pelo menos um produto para a sua operação.');
      }

      await AssinanteModel.updateFromAdmin(req.user.assinante_id, {
        produtos_habilitados: produtos
      });

      return res.redirect('/assinatura/produtos?success=Produtos atualizados com sucesso.');
    } catch (error) {
      const message = error.message || 'Erro ao atualizar produtos.';
      return res.redirect(`/assinatura/produtos?error=${encodeURIComponent(message)}`);
    }
  };
}

export default new AssinaturaController();