-- 004: Biblioteca de técnicas — passagem de guarda (conteúdo inicial para revisão do professor).
-- Execute uma vez no SQL Editor. Seguro rodar mais de uma vez (não duplica títulos).
alter table public.learning_contents add column if not exists sort_order int not null default 0;

-- Leitura pública SOMENTE de conteúdos publicados e apenas das colunas abaixo (sem dados internos).
drop policy if exists learning_public_read on public.learning_contents;
create policy learning_public_read on public.learning_contents for select to anon using (published);
revoke select on public.learning_contents from anon;
grant select (id,title,description,category,belt,difficulty,content_type,video_url,steps,common_errors,safety_notes,sort_order,published,created_at) on public.learning_contents to anon;

insert into public.learning_contents(title,description,category,belt,difficulty,content_type,steps,common_errors,safety_notes,published,sort_order)
select v.title,v.description,null,'Branca',v.difficulty,v.content_type,v.steps,v.errors,v.safety,true,v.sort_order from (values
($t$Postura na guarda fechada$t$,$t$Base de tudo na passagem de guarda: antes de tentar passar, aprenda a ficar bem posicionado e protegido dentro da guarda fechada do oponente.$t$,$t$Iniciante$t$,'Técnica',$t$Ajoelhe-se entre as pernas do oponente, com os joelhos abertos na largura dos ombros e o quadril baixo, sentado sobre os calcanhares.
Mantenha a coluna reta e a cabeça erguida, olhando para o oponente, com a cabeça acima do quadril dele.
Coloque as mãos no cinto ou na barriga do oponente, com os braços semiestendidos e os cotovelos próximos às suas costelas.
Mantenha o peso do corpo para baixo e levemente para a frente, sem se inclinar demais, para ele não conseguir quebrar a sua postura.
Se ele puxar a sua cabeça ou gola para baixo, estenda os braços, empurre o quadril para trás e volte à postura.
Respire normalmente e fique atento às mãos e pegadas do oponente antes de iniciar a abertura da guarda.$t$,$t$Curvar a coluna e deixar a cabeça ficar abaixo do quadril do oponente.
Apoiar as mãos no chão ao lado dele, perdendo o controle do quadril.
Colocar as mãos no pescoço ou no rosto do oponente.
Deixar os cotovelos abertos, facilitando que ele controle os seus braços.$t$,$t$Nunca empurre o pescoço ou o rosto do colega.
Se o colega bater (tap) ou avisar, solte imediatamente.
Em crianças, treine com calma e sem puxar a gola com força.$t$,10),
($t$Abrir a guarda fechada em pé$t$,$t$Como abrir as pernas do oponente que estão fechadas ao redor do seu corpo, levantando-se com segurança para iniciar a passagem.$t$,$t$Iniciante$t$,'Técnica',$t$Comece na postura na guarda fechada, ajoelhado, com as mãos no cinto do oponente e a coluna reta.
Levante um pé de cada vez, ficando em pé com os pés afastados na largura dos ombros e os joelhos levemente flexionados.
Mantenha a cabeça alta e o tronco ereto, sem se inclinar para a frente.
Pressione o quadril do oponente para baixo, com as mãos no cinto, e vá esticando as pernas devagar.
Quando as pernas dele afrouxarem ou se abrirem, firme os joelhos dele no chão com as mãos e dê um passo para trás.
Avance já com uma postura estável para uma das passagens (toreando, passagem longa ou joelho cortando).$t$,$t$Levantar com o tronco inclinado para a frente, ficando fácil de puxar para a guarda.
Tentar abrir a guarda com força bruta em vez de pressionar o quadril.
Soltar o quadril do oponente antes de ele afrouxar as pernas.
Ficar com os pés juntos, perdendo o equilíbrio.$t$,$t$Nunca force os joelhos do colega para os lados; peça para ele soltar e recomece.
Levante-se com controle, sem pular, para não escorregar no tatame.
Ao pressionar o quadril, não empurre as costelas nem a barriga com os cotovelos.$t$,20),
($t$Passagem toreando$t$,$t$Passagem em pé em que você controla as duas pernas do oponente, joga-as para um lado e circula rapidamente para o outro. Ótima para quem é rápido e ágil.$t$,$t$Iniciante$t$,'Técnica',$t$Fique em pé em postura estável diante do oponente que está deitado, com os joelhos levemente flexionados e fora do alcance dos pés dele.
Segure as duas pernas da calça do oponente na altura dos joelhos (ou nas barras da calça), firmando bem o tecido.
Empurre as pernas dele para um dos lados, mantendo os joelhos dele juntos e perto do chão.
Passe pelo lado oposto ao que você empurrou as pernas, caminhando em arco com passos curtos e rápidos.
Sem soltar as pernas, chegue ao lado do tronco dele, com o seu quadril perto do quadril dele.
Solte as pernas, apoie o peito sobre o dele e termine na estabilização do cem quilos.$t$,$t$Ficar muito perto e deixar o oponente colocar os pés no seu quadril.
Soltar uma das pernas durante o giro, abrindo espaço para a guarda recuperar.
Passar com passos longos e desequilibrados.
Olhar para baixo e perder a noção da posição da cabeça do oponente.$t$,$t$Não torça os joelhos do colega: empurre as pernas junto, na direção natural do movimento.
Passe com velocidade moderada no treino; velocidade máxima só com o professor autorizando.
Cuidado ao cair em cima do colega ao final: apoie o peito com controle, sem jogar o peso de uma vez.$t$,30),
($t$Passagem longa (long step)$t$,$t$Passagem em que você dá um passo longo para trás/ao redor da perna do oponente, saindo da frente dos pés dele e chegando ao lado do quadril.$t$,$t$Iniciante$t$,'Técnica',$t$Fique em pé em postura estável, com uma mão na calça do oponente (na altura do joelho) e a outra pronta para controlar o quadril.
Empurre o joelho do oponente em direção ao chão, tirando o pé dele da frente do seu quadril.
Dê um passo longo com a perna do mesmo lado, passando por fora da perna dele e chegando perto da linha do quadril dele.
Gire o quadril e abaixe o peso do corpo sobre o quadril do oponente, fechando o espaço.
Retire a outra perna e posicione os joelhos próximos ao tronco dele.
Finalize em estabilização lateral (cem quilos), com o peito sobre o peito dele.$t$,$t$Dar um passo curto e deixar a perna do oponente reentrar na sua frente.
Esquecer de pressionar o joelho dele para baixo antes do passo.
Ficar em pé, sem baixar o peso, depois de passar.
Deixar a cabeça longe do corpo dele, ficando fácil de ser puxado.$t$,$t$Passe com controle; um passo longo com escorregão pode causar queda sobre o colega.
Não pise nos pés ou nas mãos do colega.
Mantenha o equilíbrio e a cabeça alta durante todo o movimento.$t$,40),
($t$Passagem de joelho cortando (knee slice)$t$,$t$Passagem clássica para a meia-guarda: você prende o ombro do oponente, corta o joelho por cima das pernas dele e libera a perna presa.$t$,$t$Iniciante$t$,'Técnica',$t$Fique por cima na meia-guarda do oponente, com o quadril baixo e o peso do corpo sobre o peito dele.
Controle o ombro ou a gola do oponente com uma das mãos (crossface com antebraço junto ao ombro, sem pressionar o pescoço) e use a outra mão para controlar o quadril ou a calça dele.
Apoie o joelho da perna livre sobre a coxa de cima do oponente, com a canela atravessada.
Deslize esse joelho para o chão do outro lado, cortando as pernas dele, enquanto faz pressão com o ombro no peito dele.
Gire o pé da perna presa para fora, como um limpador de para-brisa, até liberá-la.
Finalize com o peito sobre o peito dele em estabilização lateral.$t$,$t$Ficar com o peso para trás e deixar o oponente recolocar a guarda.
Cortar o joelho sem controlar o ombro dele, permitindo que ele vire de lado.
Pressionar o rosto ou o pescoço em vez do ombro.
Deixar o quadril alto, perdendo pressão.$t$,$t$Faça a pressão de ombro devagar, sem empurrar o rosto ou o pescoço do colega.
Pare na hora se ele bater (tap).
Cuidado com o joelho da perna presa: não gire o corpo bruscamente enquanto o pé estiver preso.$t$,50),
($t$Passagem de pressão (por cima e por baixo)$t$,$t$Passagem em que você abraça as pernas do oponente (um braço por baixo e outro por cima) e circula usando o peso do ombro. Exige paciência e controle.$t$,$t$Intermediário$t$,'Técnica',$t$Segure as duas pernas do oponente e leve os joelhos dele para um dos lados, mantendo-os juntos.
Passe um braço por baixo das pernas (underhook) e o outro por cima, prendendo as duas pernas com os braços.
Apoie o ombro sobre as coxas do oponente e mantenha a cabeça baixa, do lado para onde vai passar.
Faça pressão com o peso do corpo e caminhe em círculo com passos curtos, aproximando-se do tronco dele.
Quando o quadril dele estiver livre, solte as pernas e abaixe o quadril no chão ao lado do tronco.
Finalize no cem quilos, com o peito sobre o peito dele.$t$,$t$Pressionar a cabeça contra o peito ou o pescoço do colega em vez das coxas.
Ficar em pé demais, sem pressionar com o ombro.
Circular com passos longos e perder a pressão.
Soltar os braços antes de ter o quadril livre.$t$,$t$Mantenha o peso nas coxas do colega; evite empilhar (jogar as pernas sobre a cabeça dele).
Em crianças e adolescentes, não faça pressão forte nem empilhe; treine com intensidade leve.
Se o colega reclamar de dor no pescoço ou nas costas, pare imediatamente.$t$,60),
($t$Estabilização no cem quilos$t$,$t$Posição de controle depois de passar a guarda. Antes de pensar em finalizar, aprenda a manter o oponente imobilizado com segurança.$t$,$t$Iniciante$t$,'Técnica',$t$Fique deitado de lado sobre o tronco do oponente, com o peito sobre o peito dele e o quadril baixo.
Com um braço, controle o ombro dele passando o antebraço junto ao ombro (crossface), sem pressionar o pescoço ou a garganta.
Com o outro braço, passe por baixo da axila e prenda o quadril ou o braço dele, impedindo que se vire.
Abra as pernas para trás, com os joelhos afastados, para ter uma base ampla e evitar que ele vire.
Pressione o peso do corpo sobre o peito dele, mantendo o quadril baixo e o corpo relaxado.
Quando ele tentar escapar, acompanhe o movimento e ajuste a pressão, sem sair da posição.$t$,$t$Ficar com o quadril alto, deixando espaço para ele entrar.
Apertar o pescoço ou o rosto do colega com o antebraço.
Juntar as pernas, perdendo a base.
Ficar sem controle do braço dele, permitindo que ele vire de lado.$t$,$t$Não pressione o pescoço, a garganta ou o rosto do colega.
Em crianças, use pressão leve e deixe o oponente respirar.
Se ele disser que não consegue respirar, alivie o peso na hora.$t$,70),
($t$Treino posicional de passagem de guarda$t$,$t$Exercício em dupla para treinar as passagens com segurança, aumentando a resistência aos poucos. Um passa, o outro defende a guarda.$t$,$t$Iniciante$t$,'Exercício',$t$Forme duplas de tamanho e peso parecidos. Um é o passador e o outro é o guardeiro.
Comece com a guarda do oponente aberta ou fechada, conforme o professor indicar.
Rodada 1 (resistência 30%): o guardeiro apenas se movimenta e não impede; o passador treina a técnica do dia.
Rodada 2 (resistência 60%): o guardeiro tenta recuperar a guarda; o passador procura passar com controle.
Rodada 3 (resistência 80%): treino mais realista, com o professor observando.
Troquem de papel a cada rodada e conversem sobre o que funcionou e o que errou.
Descanso de 30 segundos entre as rodadas, com água e respiração tranquila.$t$,$t$Ir com força total desde a primeira rodada.
Treinar sem conversar com o colega sobre a intensidade.
Insistir na mesma passagem sem ajustar quando ela não funciona.
Focar só em passar, esquecendo de manter o controle e a postura.$t$,$t$Combine o ritmo com o colega antes de começar.
Pare imediatamente quando houver o bate (tap) ou um aviso verbal.
O professor deve acompanhar sempre, principalmente com crianças e adolescentes.
Evite sparring com forte resistência para quem acabou de começar.$t$,80)
) as v(title,description,difficulty,content_type,steps,errors,safety,sort_order)
where not exists (select 1 from public.learning_contents c where c.title=v.title);
