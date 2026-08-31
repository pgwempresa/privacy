// Client-side translations for the public model page.
// pt-BR (Brazil), pt-PT (Portugal) and es-MX (Mexico).
window.I18N = {
  'pt-BR': {
    htmlLang: 'pt-BR',

    // Profile / tabs
    subscriptions: 'Assinaturas',
    promotions: 'Promoções',
    posts: 'Postagens',
    media: 'Mídias',
    photos: 'Fotos',
    videos: 'Vídeos',
    locked: 'Bloqueado',
    likes: 'Curtidas',
    readMore: 'Ler mais',
    readLess: 'Ler menos',
    register: 'Cadastrar',
    login: 'Login',
    accept: 'Aceitar',
    cookieMsg: 'A Privacy utiliza cookies e tecnologias semelhantes para fornecer, manter e melhorar nossos serviços.',
    privacyPolicy: 'Política de Privacidade',
    securePayment: 'Pagamento 100% seguro · Cobrança discreta no cartão',
    selectedAlert: 'Você selecionou',

    // Social gate (clicking Instagram/X/TikTok before subscribing)
    socialGateTitle: 'Escolha um plano para ver',
    socialGateDesc: 'Para acessar as redes sociais exclusivas, assine um plano abaixo.',
    socialGatePayPrefix: 'Assinar',
    socialGateSeePlans: 'Ver todos os planos',

    // Page-level
    loading: 'Carregando…',
    pageNotFound: 'Página não encontrada.',
    modelNotFound: 'Modelo não encontrado.',
    loadError: 'Erro ao carregar.',
    paymentsUnavailable: 'Pagamentos para esta página ainda não estão disponíveis. Em breve!',

    // Checkout — form
    howToPay: 'Como quer pagar?',
    mbwayName: 'MB Way',
    mbwaySub: 'Pagamento instantâneo no app',
    multibancoName: 'Multibanco',
    multibancoSub: 'Referência e entidade',
    pixName: 'Pix',
    pixSub: 'QR Code ou copia e cola',
    speiName: 'SPEI',
    speiSub: 'Transferência por CLABE',
    oxxoName: 'OXXO',
    oxxoSub: 'Pagamento em dinheiro na loja',
    fieldName: 'Nome',
    fieldEmail: 'Email',
    fieldPhoneMbway: 'Celular (MB Way)',
    fieldDocumentMexico: 'CURP / RFC',
    phonePlaceholder: '+351 9...',
    documentPlaceholder: 'Ex.: PEPJ800101HDFRRL09',
    payNow: 'Pagar',
    processing: 'Processando...',
    fineprint: 'Cobrança processada pela WayMB. Não armazenamos dados de pagamento.',
    fineprintNexuspag: 'Cobrança processada pela NexusPag. Não armazenamos dados de pagamento.',
    fineprintXpag: 'Cobrança SPEI processada pela XPag. Não armazenamos dados bancários.',
    fineprintOxxo: 'Ficha OXXO processada pela XPag. Não armazenamos dados bancários.',

    // Checkout — MB Way pending
    mbwayPendingTitle: 'Confirme no app MB Way',
    mbwayPendingDesc: 'Abrimos uma solicitação no seu celular. Abra o app MB Way e confirme o pagamento.',
    mbwayMetaTo: 'Solicitação enviada para ',
    mbwayMetaPhoneFallback: 'o seu celular',
    mbwayPhoneRequired: 'Informe o número de celular para pagar com MB Way.',

    // Checkout — Multibanco pending
    multibancoTitle: 'Pague por Multibanco',
    multibancoDesc: 'Use estes dados no internet banking ou em um caixa Multibanco:',
    multibancoEntity: 'Entidade',
    multibancoReference: 'Referência',
    multibancoAmount: 'Valor',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado ✓',
    multibancoMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',

    // Checkout — Pix pending
    pixTitle: 'Pague com Pix',
    pixDesc: 'Escaneie o QR Code no app do seu banco ou copie o código abaixo:',
    pixCopyLabel: 'Pix copia e cola',
    pixExpiresMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',
    pixError: 'Não foi possível gerar a cobrança Pix. Tente novamente.',
    pixLoadingTitle: 'Gerando QR Code Pix…',

    // Checkout — SPEI pending
    speiTitle: 'Pague por transferência SPEI',
    speiDesc: 'No app do seu banco, faça uma transferência para a CLABE abaixo:',
    speiClabe: 'CLABE',
    speiReference: 'Referência',
    speiBank: 'Banco',
    speiBeneficiary: 'Beneficiário',
    speiAmount: 'Valor',
    speiMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',
    speiDocumentRequired: 'Informe seu CURP ou RFC para gerar a cobrança SPEI.',

    // Checkout — OXXO pending
    oxxoTitle: 'Pague em dinheiro no OXXO',
    oxxoDesc: 'Mostre o código de barras ou informe a referência no caixa de qualquer loja OXXO. Pague o valor exato.',
    oxxoReference: 'Referência',
    oxxoAmount: 'Valor',
    oxxoMeta: 'A confirmação pode demorar após o pagamento na loja. Esta página será atualizada automaticamente.',
    oxxoBarcodeAlt: 'Código de barras OXXO',
    oxxoError: 'Não foi possível gerar a ficha OXXO. Tente novamente.',
    oxxoRangeError: 'O OXXO aceita pagamentos de $10,00 MXN a $10.000,00 MXN.',

    // Checkout — success
    successTitle: 'Pagamento confirmado',
    successWithLink: 'Obrigada pela sua assinatura! Acesse o conteúdo no botão abaixo.',
    successWithoutLink: 'Obrigada pela sua assinatura! Você já tem acesso ao conteúdo.',
    successRedirecting: 'Pagamento confirmado. Redirecionando para o seu acesso…',
    redirectNotice: 'Você será redirecionado em instantes…',
    accessContent: 'Acessar conteúdo',
    closeBtn: 'Fechar',

    // Checkout — declined
    declinedTitle: 'Pagamento recusado',
    declinedDesc: 'Não recebemos a confirmação do pagamento. Tente novamente ou use outro método.',
    retryBtn: 'Tentar de novo',

    // Checkout — TSL (Tarifa de Segurança)
    tslTitle: '🔒 Tarifa de Segurança – Verificação Obrigatória',
    tslIntro: 'Nós, da equipe Privacy, prezamos pela qualidade, segurança e privacidade dos nossos membros.',
    tslBody: 'Por isso, ativamos a Tarifa de Segurança Legal (T.S.L.), um protocolo obrigatório de verificação.',
    tslRefund: '💳 O valor é simbólico, serve apenas como filtro de acesso seguro e é 100% reembolsável após a verificação.',
    tslWarningTitle: '⚠️ Atenção:',
    tslWarningBody: 'Se você não concluir essa verificação agora, seu acesso será bloqueado permanentemente.',
    tslAmountLabel: 'Valor da tarifa',
    tslPayBtn: 'Pagar tarifa de segurança',
    tslReference: 'Tarifa de Segurança',

    // Checkout — errors
    connError: 'Erro de conexão. Tente novamente.',
    gatewayNotConfigured: 'Gateway de pagamento não configurado. Tente mais tarde.',
    gatewayAuthError: 'Credencial do gateway inválida. Verifique a chave em /admin/integracoes.',
    pageNotAcceptingPayments: 'Esta página ainda não aceita pagamentos.',
    genericPayError: 'Falha no pagamento. Tente novamente.',

    // Test/preview
    previewRedirect: 'Modo teste: em produção o cliente seria redirecionado para a URL abaixo.',
    previewNoUrl: 'Modo teste: nenhuma URL de entregável configurada. O cliente veria apenas a confirmação genérica.',
    previewOpenUrl: 'Abrir URL de redirecionamento'
  },

  'pt-PT': {
    htmlLang: 'pt-PT',

    subscriptions: 'Subscrições',
    promotions: 'Promoções',
    posts: 'Publicações',
    media: 'Multimédia',
    photos: 'Fotos',
    videos: 'Vídeos',
    locked: 'Bloqueado',
    likes: 'Gostos',
    readMore: 'Ler mais',
    readLess: 'Ler menos',
    register: 'Registar',
    login: 'Iniciar sessão',
    accept: 'Aceitar',
    cookieMsg: 'A Privacy utiliza cookies e tecnologias semelhantes para fornecer, manter e melhorar os nossos serviços.',
    privacyPolicy: 'Política de Privacidade',
    securePayment: 'Pagamento 100% seguro · Cobrança discreta no cartão',
    selectedAlert: 'Selecionaste',

    // Social gate
    socialGateTitle: 'Escolhe um plano para ver',
    socialGateDesc: 'Para aceder às redes sociais exclusivas, subscreve um plano abaixo.',
    socialGatePayPrefix: 'Subscrever',
    socialGateSeePlans: 'Ver todos os planos',

    loading: 'A carregar…',
    pageNotFound: 'Página não encontrada.',
    modelNotFound: 'Modelo não encontrado.',
    loadError: 'Erro ao carregar.',
    paymentsUnavailable: 'Os pagamentos para esta página ainda não estão disponíveis. Em breve!',

    howToPay: 'Como queres pagar?',
    mbwayName: 'MB Way',
    mbwaySub: 'Pagamento instantâneo na app',
    multibancoName: 'Multibanco',
    multibancoSub: 'Referência e entidade',
    pixName: 'Pix',
    pixSub: 'QR Code ou copia e cola',
    speiName: 'SPEI',
    speiSub: 'Transferência por CLABE',
    oxxoName: 'OXXO',
    oxxoSub: 'Pagamento em dinheiro na loja',
    fieldName: 'Nome',
    fieldEmail: 'Email',
    fieldPhoneMbway: 'Telemóvel (MB Way)',
    fieldDocumentMexico: 'CURP / RFC',
    phonePlaceholder: '+351 9...',
    documentPlaceholder: 'Ex.: PEPJ800101HDFRRL09',
    payNow: 'Pagar',
    processing: 'A processar...',
    fineprint: 'Cobrança processada pela WayMB. Não guardamos dados de pagamento.',
    fineprintNexuspag: 'Cobrança processada pela NexusPag. Não guardamos dados de pagamento.',
    fineprintXpag: 'Cobrança SPEI processada pela XPag. Não guardamos dados bancários.',
    fineprintOxxo: 'Ficha OXXO processada pela XPag. Não guardamos dados bancários.',

    mbwayPendingTitle: 'Confirma na app MB Way',
    mbwayPendingDesc: 'Abrimos um pedido no teu telemóvel. Abre a app MB Way e confirma o pagamento.',
    mbwayMetaTo: 'Pedido enviado para ',
    mbwayMetaPhoneFallback: 'o teu telemóvel',
    mbwayPhoneRequired: 'Indica o telemóvel para pagar com MB Way.',

    multibancoTitle: 'Paga por Multibanco',
    multibancoDesc: 'Usa estes dados no homebanking ou numa caixa Multibanco:',
    multibancoEntity: 'Entidade',
    multibancoReference: 'Referência',
    multibancoAmount: 'Valor',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado ✓',
    multibancoMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',

    // Checkout — Pix pending
    pixTitle: 'Paga com Pix',
    pixDesc: 'Lê o QR Code na app do teu banco ou copia o código abaixo:',
    pixCopyLabel: 'Pix copia e cola',
    pixExpiresMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',
    pixError: 'Não foi possível gerar a cobrança Pix. Tenta novamente.',
    pixLoadingTitle: 'A gerar QR Code Pix…',

    speiTitle: 'Paga por transferência SPEI',
    speiDesc: 'Na app do teu banco, faz uma transferência para a CLABE abaixo:',
    speiClabe: 'CLABE',
    speiReference: 'Referência',
    speiBank: 'Banco',
    speiBeneficiary: 'Beneficiário',
    speiAmount: 'Valor',
    speiMeta: 'Esta página é atualizada automaticamente quando o pagamento for confirmado.',
    speiDocumentRequired: 'Indica o teu CURP ou RFC para gerar a cobrança SPEI.',

    oxxoTitle: 'Paga em dinheiro no OXXO',
    oxxoDesc: 'Mostra o código de barras ou indica a referência na caixa de qualquer loja OXXO. Paga o valor exato.',
    oxxoReference: 'Referência',
    oxxoAmount: 'Valor',
    oxxoMeta: 'A confirmação pode demorar após o pagamento na loja. Esta página será atualizada automaticamente.',
    oxxoBarcodeAlt: 'Código de barras OXXO',
    oxxoError: 'Não foi possível gerar a ficha OXXO. Tenta novamente.',
    oxxoRangeError: 'O OXXO aceita pagamentos de $10,00 MXN a $10.000,00 MXN.',

    successTitle: 'Pagamento confirmado',
    successWithLink: 'Obrigada pela tua subscrição! Acede ao conteúdo no botão abaixo.',
    successWithoutLink: 'Obrigada pela tua subscrição! Já tens acesso ao conteúdo.',
    successRedirecting: 'Pagamento confirmado. A redirecionar para o teu acesso…',
    redirectNotice: 'Vais ser redirecionado dentro de momentos…',
    accessContent: 'Aceder ao conteúdo',
    closeBtn: 'Fechar',

    declinedTitle: 'Pagamento recusado',
    declinedDesc: 'Não recebemos a confirmação do pagamento. Tenta novamente ou usa outro método.',
    retryBtn: 'Tentar de novo',

    // Checkout — TSL (Tarifa de Segurança)
    tslTitle: '🔒 Taxa de Segurança – Verificação Obrigatória',
    tslIntro: 'Nós, da equipa Privacy, prezamos pela qualidade, segurança e privacidade dos nossos membros.',
    tslBody: 'Por isso, ativámos a Taxa de Segurança Legal (T.S.L.), um protocolo obrigatório de verificação.',
    tslRefund: '💳 O valor é simbólico, serve apenas como filtro de acesso seguro e é 100% reembolsável após a verificação.',
    tslWarningTitle: '⚠️ Atenção:',
    tslWarningBody: 'Se não concluíres esta verificação agora, o teu acesso será bloqueado permanentemente.',
    tslAmountLabel: 'Valor da taxa',
    tslPayBtn: 'Pagar taxa de segurança',
    tslReference: 'Taxa de Segurança',

    connError: 'Erro de ligação. Tenta novamente.',
    gatewayNotConfigured: 'Gateway de pagamento não configurado. Tenta mais tarde.',
    gatewayAuthError: 'Credencial do gateway inválida. Verifica a chave em /admin/integracoes.',
    pageNotAcceptingPayments: 'Esta página ainda não aceita pagamentos.',
    genericPayError: 'Falha no pagamento. Tenta novamente.',

    previewRedirect: 'Modo teste: em produção o cliente seria redirecionado para o URL abaixo.',
    previewNoUrl: 'Modo teste: nenhum URL de entregável configurado. O cliente veria apenas a confirmação genérica.',
    previewOpenUrl: 'Abrir URL de redirecionamento'
  },

  'es-MX': {
    htmlLang: 'es-MX',

    subscriptions: 'Suscripciones',
    promotions: 'Promociones',
    posts: 'Publicaciones',
    media: 'Contenido',
    photos: 'Fotos',
    videos: 'Videos',
    locked: 'Bloqueado',
    likes: 'Me gusta',
    readMore: 'Ver más',
    readLess: 'Ver menos',
    register: 'Registrarse',
    login: 'Iniciar sesión',
    accept: 'Aceptar',
    cookieMsg: 'Privacy utiliza cookies y tecnologías similares para ofrecer, mantener y mejorar nuestros servicios.',
    privacyPolicy: 'Política de privacidad',
    securePayment: 'Pago 100% seguro · Cargo discreto en tu estado de cuenta',
    selectedAlert: 'Seleccionaste',

    socialGateTitle: 'Elige un plan para continuar',
    socialGateDesc: 'Para acceder a las redes sociales exclusivas, suscríbete a uno de los planes.',
    socialGatePayPrefix: 'Suscribirme',
    socialGateSeePlans: 'Ver todos los planes',

    loading: 'Cargando…',
    pageNotFound: 'Página no encontrada.',
    modelNotFound: 'Perfil no encontrado.',
    loadError: 'Error al cargar.',
    paymentsUnavailable: 'Los pagos en esta página todavía no están disponibles. ¡Muy pronto!',

    howToPay: '¿Cómo quieres pagar?',
    mbwayName: 'MB Way',
    mbwaySub: 'Pago instantáneo en la app',
    multibancoName: 'Multibanco',
    multibancoSub: 'Referencia y entidad',
    pixName: 'Pix',
    pixSub: 'Código QR o copia y pega',
    speiName: 'SPEI',
    speiSub: 'Transferencia bancaria con CLABE interbancaria',
    oxxoName: 'OXXO',
    oxxoSub: 'Pago en efectivo en tienda',
    fieldName: 'Nombre completo',
    fieldEmail: 'Correo electrónico',
    fieldPhoneMbway: 'Número de celular',
    fieldDocumentMexico: 'CURP o RFC',
    phonePlaceholder: '+52 55...',
    documentPlaceholder: 'Ej.: PEPJ800101HDFRRL09',
    payNow: 'Continuar con el pago',
    processing: 'Procesando…',
    fineprint: 'Pago procesado de forma segura. No almacenamos tus datos bancarios.',
    fineprintNexuspag: 'Pago procesado de forma segura por NexusPag. No almacenamos tus datos bancarios.',
    fineprintXpag: 'Transferencia SPEI procesada de forma segura por XPag. No almacenamos tus datos bancarios.',
    fineprintOxxo: 'Ficha OXXO generada de forma segura por XPag.',

    mbwayPendingTitle: 'Confirma en la app MB Way',
    mbwayPendingDesc: 'Enviamos una solicitud a tu teléfono. Abre la app MB Way y confirma el pago.',
    mbwayMetaTo: 'Solicitud enviada a ',
    mbwayMetaPhoneFallback: 'tu teléfono',
    mbwayPhoneRequired: 'Ingresa tu teléfono para pagar con MB Way.',

    multibancoTitle: 'Paga con Multibanco',
    multibancoDesc: 'Utiliza estos datos en tu banca en línea o en un cajero Multibanco:',
    multibancoEntity: 'Entidad',
    multibancoReference: 'Referencia',
    multibancoAmount: 'Importe',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado ✓',
    multibancoMeta: 'Esta página se actualiza automáticamente cuando se confirme el pago.',

    pixTitle: 'Paga con Pix',
    pixDesc: 'Escanea el código QR en la app de tu banco o copia el código:',
    pixCopyLabel: 'Pix copia y pega',
    pixExpiresMeta: 'Esta página se actualiza automáticamente cuando se confirme el pago.',
    pixError: 'No fue posible generar el cobro Pix. Inténtalo de nuevo.',
    pixLoadingTitle: 'Generando el código QR Pix…',

    speiTitle: 'Paga mediante transferencia SPEI',
    speiDesc: 'Desde la app de tu banco, transfiere el monto exacto a la siguiente CLABE:',
    speiClabe: 'CLABE',
    speiReference: 'Referencia',
    speiBank: 'Banco',
    speiBeneficiary: 'Beneficiario',
    speiAmount: 'Monto',
    speiMeta: 'Esta página se actualizará automáticamente cuando se confirme el pago.',
    speiDocumentRequired: 'Ingresa tu CURP o RFC para generar el cobro SPEI.',

    oxxoTitle: 'Paga en efectivo en OXXO',
    oxxoDesc: 'Presenta el código de barras o indica la referencia en la caja de cualquier tienda OXXO. Paga el monto exacto.',
    oxxoReference: 'Referencia',
    oxxoAmount: 'Monto',
    oxxoMeta: 'La confirmación puede tardar después del pago en la tienda. Esta página se actualizará automáticamente.',
    oxxoBarcodeAlt: 'Código de barras OXXO',
    oxxoError: 'No fue posible generar la ficha OXXO. Inténtalo de nuevo.',
    oxxoRangeError: 'OXXO acepta pagos de $10.00 MXN a $10,000.00 MXN.',

    successTitle: 'Pago confirmado',
    successWithLink: '¡Gracias por suscribirte! Accede al contenido con el botón de abajo.',
    successWithoutLink: '¡Gracias por suscribirte! Ya tienes acceso al contenido.',
    successRedirecting: 'Pago confirmado. Te estamos llevando a tu contenido…',
    redirectNotice: 'Serás redirigido en unos segundos…',
    accessContent: 'Acceder al contenido',
    closeBtn: 'Cerrar',

    declinedTitle: 'Pago rechazado',
    declinedDesc: 'No pudimos confirmar tu pago. Inténtalo de nuevo o utiliza otro método.',
    retryBtn: 'Intentar de nuevo',

    tslTitle: '🔒 Tarifa de seguridad – Verificación obligatoria',
    tslIntro: 'En Privacy cuidamos la calidad, la seguridad y la privacidad de nuestros miembros.',
    tslBody: 'Por eso activamos una tarifa de verificación de seguridad obligatoria.',
    tslRefund: '💳 El monto es simbólico, funciona como filtro de acceso seguro y es 100% reembolsable después de la verificación.',
    tslWarningTitle: '⚠️ Atención:',
    tslWarningBody: 'Si no completas esta verificación ahora, tu acceso será bloqueado permanentemente.',
    tslAmountLabel: 'Monto de la tarifa',
    tslPayBtn: 'Pagar tarifa de seguridad',
    tslReference: 'Tarifa de seguridad',

    connError: 'Error de conexión. Inténtalo de nuevo.',
    gatewayNotConfigured: 'La pasarela de pago no está configurada. Inténtalo más tarde.',
    gatewayAuthError: 'Las credenciales de pago no son válidas. Comunícate con soporte.',
    pageNotAcceptingPayments: 'Esta página todavía no acepta pagos.',
    genericPayError: 'No se pudo procesar el pago. Inténtalo de nuevo.',

    previewRedirect: 'Modo de prueba: en producción el cliente sería redirigido a la siguiente URL.',
    previewNoUrl: 'Modo de prueba: no hay una URL de contenido configurada.',
    previewOpenUrl: 'Abrir URL de redirección'
  }
};

window.formatPrice = function (amount, currency) {
  const num = typeof amount === 'number' ? amount : Number(String(amount || 0).replace(',', '.'));
  if (!isFinite(num)) return '';
  if (currency === 'EUR') {
    return num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
  if (currency === 'MXN') {
    const value = num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${value} MXN`;
  }
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.t = function (locale, key) {
  const dict = window.I18N[locale] || window.I18N['pt-BR'];
  return dict[key] || window.I18N['pt-BR'][key] || key;
};
