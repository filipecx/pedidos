import React from "react";

export function TermsContent() {
  return (
    <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">
          CONTRATO DE LICENCIAMENTO DE SOFTWARE (SAAS) E TERMOS DE USO DA PLATAFORMA
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">1. DAS PARTES E QUALIFICAÇÃO</h3>
        <p>
          Este instrumento vincula juridicamente a <strong>[NOME DA SUA PLATAFORMA]</strong> (aqui denominada simplesmente &quot;<strong>PLATAFORMA</strong>&quot; ou &quot;<strong>CONTRATADA</strong>&quot;) e a pessoa física ou jurídica que realiza o cadastro para utilização das ferramentas tecnológicas (aqui denominada &quot;<strong>LOJISTA</strong>&quot; ou &quot;<strong>CONTRATANTE</strong>&quot;).
        </p>
        <p>
          Ao assinalar a opção de aceite e concluir o cadastro, o LOJISTA declara expressamente ter lido, compreendido e concordado com a totalidade das cláusulas deste Contrato.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">2. OBJETO E NATUREZA JURÍDICA DO SERVIÇO (SAAS)</h3>
        <p>
          2.1. O presente contrato tem por objeto o licenciamento não exclusivo, intransferível e temporário de acesso e uso do software sob a modalidade <strong>SaaS (Software as a Service)</strong>, disponibilizando ferramentas de:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cardápio e vitrine digital personalizada própria para catálogo de produtos (pronta-entrega e encomendas);</li>
          <li>Painel operacional interno para gerenciamento, triagem e acompanhamento de pedidos;</li>
          <li>Integração tecnológica para viabilização de cobranças automatizadas via tecnologia PIX.</li>
        </ul>
        <p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 font-medium">
          2.2. <strong>DISTINÇÃO ESSENCIAL:</strong> A PLATAFORMA <strong>NÃO É UM MARKETPLACE</strong>, não intermedia a relação de consumo com os clientes finais, não vende alimentos, não faz controle de estoque físico e não presta serviços de entrega, motoboy ou frete. A PLATAFORMA atua exclusivamente como fornecedora da infraestrutura de software.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">3. RESPONSABILIDADES SANITÁRIAS, QUALIDADE E PRODUÇÃO</h3>
        <p>
          3.1. O LOJISTA é o <strong>ÚNICO E EXCLUSIVO RESPONSÁVEL</strong> por:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Procedência, preparo, manipulação, armazenamento, prazos de validade e higiene de todos os alimentos e confeitos comercializados em sua vitrine;</li>
          <li>Cumprimento integral de todas as exigências das autoridades sanitárias (ANVISA / Vigilância Sanitária Municipal e Estadual) e obtenção de alvarás aplicáveis;</li>
          <li>Informações sobre ingredientes, tabelas nutricionais e alertas expressos e visíveis sobre substâncias alergênicas (glúten, lactose, oleaginosas, etc.);</li>
          <li>Cumprimento dos prazos de preparo e datas agendadas para retiradas ou encomendas.</li>
        </ul>
        <p>
          3.2. A PLATAFORMA exime-se formalmente de qualquer responsabilidade civil, administrativa ou criminal decorrente de danos à saúde, contaminação alimentar, defeitos ou vícios dos produtos vendidos pelo LOJISTA.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">4. FLUXO FINANCEIRO, CHAVE PIX E TAXAS DE SERVIÇO</h3>
        <p>
          4.1. <strong>Recebimento Direto:</strong> Os pagamentos efetuados pelos clientes finais através do QR Code PIX são processados via integração automatizada e repassados diretamente à chave PIX cadastrada e titularizada pelo LOJISTA.
        </p>
        <p>
          4.2. <strong>Ausência de Custódia Financeira:</strong> A PLATAFORMA não é instituição financeira, não realiza custódia ou retenção de depósitos de terceiros e não opera conta de pagamento.
        </p>
        <p>
          4.3. <strong>Taxas Operacionais:</strong> Pela utilização da tecnologia, a PLATAFORMA poderá aplicar taxa de serviço por transação processada ou plano de assinatura conforme contratado. Nos casos de taxa por transação, o valor será retido ou cobrado no ato do split via gateway tecnológico, com prévia ciência e autorização do LOJISTA.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">5. CANCELAMENTOS, ESTORNOS E DEVOLUÇÕES</h3>
        <p>
          5.1. Havendo necessidade de cancelamento do pedido (ex: indisponibilidade de insumos, desistência do cliente nos termos legais ou falta de capacidade produtiva), o LOJISTA é responsável por processar ou solicitar o estorno financeiro devido ao cliente final.
        </p>
        <p>
          5.2. O LOJISTA compromete-se a indenizar regressivamente e manter indene a PLATAFORMA em face de quaisquer disputas judiciais ou extrajudiciais ajuizadas por consumidores finais em razão de descumprimento de entrega, estorno ou pedidos defeituosos.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">6. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD - LEI Nº 13.709/18)</h3>
        <p>
          6.1. No tratamento de dados pessoais de clientes finais recebidos para fins de pedido e entrega:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>O <strong>LOJISTA</strong> atua na condição jurídica de <strong>CONTROLADOR</strong> dos dados pessoais;</li>
          <li>A <strong>PLATAFORMA</strong> atua na condição jurídica de <strong>OPERADORA</strong>, limitando-se a armazenar e transmitir os dados estritamente necessários para a conclusão operacional do pedido.</li>
        </ul>
        <p>
          6.2. É estritamente proibido ao LOJISTA comercializar, ceder ou utilizar os dados cadastrais e de contato dos clientes para finalidades ilícitas, abusivas ou envio de comunicações em massa sem prévio consentimento.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">7. DISPONIBILIDADE DO SISTEMA (SLA) E LIMITAÇÃO DE RESPONSABILIDADE</h3>
        <p>
          7.1. O software é fornecido no estado em que se encontra (&quot;as is&quot;). Embora a PLATAFORMA empregue os melhores padrões de mercado e infraestrutura em nuvem de alta disponibilidade, não garante operação 100% ininterrupta ou livre de erros pontuais, em especial por motivos de força maior, instabilidade da internet ou indisponibilidade do Sistema de Pagamentos Instantâneos (SPI / PIX) do Banco Central do Brasil.
        </p>
        <p>
          7.2. A PLATAFORMA não responderá por lucros cessantes, prejuízos comerciais indiretos ou perdas de receitas decorrentes de quedas temporárias de conectividade.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">8. RESCISÃO, SUSPENSÃO E CANCELAMENTO DA CONTA</h3>
        <p>
          8.1. A PLATAFORMA reserva-se o direito de suspender cautelarmente ou encerrar a conta do LOJISTA, a qualquer momento e sem necessidade de aviso prévio, caso sejam identificadas:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Práticas de estelionato, fraudes de pagamento, golpes de chave PIX ou lavagem de dinheiro;</li>
          <li>Comercialização de substâncias proibidas, ilícitas ou nocivas à saúde pública;</li>
          <li>Violação de direitos autorais e de propriedade industrial de terceiros em imagens, logotipos ou marcas exibidas na vitrine;</li>
          <li>Inadimplência reiterada de taxas ou descumprimento de qualquer disposição deste Contrato.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-gray-900 text-base">9. FORO DE ELEIÇÃO</h3>
        <p>
          As partes elegem o Foro da Comarca da sede da CONTRATADA como o único competente para dirimir quaisquer litígios ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>
      </section>
    </div>
  );
}
