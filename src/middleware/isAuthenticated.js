const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        console.log("Usuário não autenticado");
        return res.redirect('/login?erro=Por favor, faça login primeiro.');
    }
 };
 
export default isAuthenticated;
