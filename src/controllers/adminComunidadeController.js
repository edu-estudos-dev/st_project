import forumTopicModel from '../models/forumTopicModel.js';
import forumReplyModel from '../models/forumReplyModel.js';

function formatarDataForum(data) {
  if (!data) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(data));
}

function getRedirectBack(req) {
  return req.get('referer') || '/admin/comunidade';
}

const AdminComunidadeController = {
  async index(req, res, next) {
    try {
      const topicos = await forumTopicModel.listarAdmin({ limit: 100 });

      return res.render('pages/admin/comunidade', {
        title: 'Admin Comunidade | VendMaster',
        metaDescription:
          'Painel administrativo da Comunidade VendMaster.',
        canonicalUrl: 'https://vendmaster.com.br/admin/comunidade',
        robotsMeta: 'noindex, nofollow',
        topicos,
        formatarDataForum,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      return next(error);
    }
  },

  async ocultarTopico(req, res, next) {
  try {
    const { id } = req.params;

    await forumTopicModel.ocultar(id);

    return res.redirect('/admin/comunidade?success=Tópico ocultado com sucesso.');
  } catch (error) {
    return next(error);
  }
},

async reexibirTopico(req, res, next) {
  try {
    const { id } = req.params;

    const topico = await forumTopicModel.reexibir(id);

    if (!topico) {
      return res.redirect('/admin/comunidade?error=Não foi possível reexibir o tópico.');
    }

    return res.redirect('/admin/comunidade?success=Tópico reexibido com sucesso.');
  } catch (error) {
    return next(error);
  }
},

  async alternarFixadoTopico(req, res, next) {
    try {
      const { id } = req.params;

      await forumTopicModel.alternarFixado(id);

      return res.redirect('/admin/comunidade?success=Status de fixação atualizado.');
    } catch (error) {
      return next(error);
    }
  },

  async alternarFechadoTopico(req, res, next) {
    try {
      const { id } = req.params;

      await forumTopicModel.alternarFechado(id);

      return res.redirect('/admin/comunidade?success=Status do tópico atualizado.');
    } catch (error) {
      return next(error);
    }
  },

  async ocultarResposta(req, res, next) {
    try {
      const { id } = req.params;

      await forumReplyModel.ocultar(id);

      return res.redirect(`${getRedirectBack(req)}?success=Resposta ocultada com sucesso.`);
    } catch (error) {
      return next(error);
    }
  }
};

export default AdminComunidadeController;