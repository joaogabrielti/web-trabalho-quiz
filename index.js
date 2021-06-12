const OpenQuiz = {
    dom: {
        janela: {
            iniciarJogo: document.getElementById('janelaIniciarJogo'),
            responderPergunta: document.getElementById('janelaResponderPergunta')
        },
        label: {
            pontos: document.getElementById('pontos'),
            erros: document.getElementById('erros'),
            dificuldade: document.getElementById('dificuldade'),
            categoria: document.getElementById('categoria'),
            questao: document.getElementById('questao'),
            resultadoPontos: document.getElementById('resultadoPontos'),
            resultadoCategoria: document.getElementById('resultadoCategoria'),
            resultadoDificuldade: document.getElementById('resultadoDificuldade'),
            resultadoRespondidas: document.getElementById('resultadoRespondidas'),
            resultadoAcertos: document.getElementById('resultadoAcertos'),
            resultadoErros: document.getElementById('resultadoErros')
        },
        input: {
            dificuldade: document.querySelector('select[name="dificuldade"]'),
            categoria: document.querySelector('select[name="categoria"]')
        },
        element: {
            alternativas: document.getElementById('alternativas'),
            actionResponderPergunta: document.getElementById('actionResponderPergunta'),
            actionFinalizarJogo: document.getElementById('actionFinalizarJogo'),
            modal: document.getElementById('modalResultado'),
            modalLabel: document.getElementById('modalResultadoLabel')
        },
        template: {
            alternativa: undefined
        }
    },
    function: {
        arrayShuffle: function (array) {
            var m = array.length, t, i;
            while (m) {
                i = Math.floor(Math.random() * m--);
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }
            return array;
        },
        decodeText: function (text) {
            let element = document.createElement('textarea');
            element.innerHTML = text;
            return element.value;
        }
    },
    pontos: 0,
    erros: 0,
    maxErros: 3,
    respondidas: 0,
    perguntaAtual: undefined,
    perguntaPulada: undefined,
    nerf: false,
    dificuldade: undefined,
    categoria: undefined,
    categorias: [],
    iniciar: function () {
        this.dificuldade = this.dom.input.dificuldade.value;
        this.categoria = this.dom.input.categoria.value;

        this.dom.janela.iniciarJogo.classList.add('d-none');
        this.dom.janela.responderPergunta.classList.remove('d-none');

        this.dom.template.alternativa = document.getElementById('alternativas').children[0].cloneNode(true);
        document.getElementById('alternativas').removeChild(document.getElementById('alternativas').children[0]);

        this.getPergunta();
    },
    getCategorias: function () {
        if (this.categorias.length > 0) return;
        const proxy = 'https://cors-anywhere.herokuapp.com/';
        axios.get(`${proxy}https://opentdb.com/api_category.php`).then(function (json) {
            OpenQuiz.categorias = json.data.trivia_categories;
            for (const categoria of OpenQuiz.categorias) {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.name;
                OpenQuiz.dom.input.categoria.appendChild(option);
            }
        }).catch(function (erro) { console.error(erro.message); });
    },
    getPergunta: function (maisTarde = false) {
        if (maisTarde) {
            if (this.perguntaPulada == undefined) {
                alert('Não há pergunta guardada!');
                return;
            }

            this.nerf = true;
            this.perguntaAtual = this.perguntaPulada;
            this.perguntaPulada = undefined;
            this.atualizaLabels();
            this.mostrarPergunta();
            return;
        }

        const proxy = 'https://cors-anywhere.herokuapp.com/';
        let url = `https://opentdb.com/api.php?amount=1&difficulty=${this.dificuldade}`;
        if (this.categoria != 0) url += `&category=${this.categoria}`;

        axios.get(`${proxy}${url}`).then(function (json) {
            OpenQuiz.perguntaAtual = json.data.results[0];
            OpenQuiz.atualizaLabels();
            OpenQuiz.mostrarPergunta();
        }).catch(function (erro) { console.error(erro.message); });
    },
    mostrarPergunta: function () {
        this.dom.label.questao.textContent = this.function.decodeText(this.perguntaAtual.question);

        this.dom.element.actionResponderPergunta.classList.remove('d-none');
        this.dom.element.actionFinalizarJogo.classList.add('d-none');

        const alternativas = [];
        alternativas.push(this.perguntaAtual.correct_answer);
        for (const alt of this.perguntaAtual.incorrect_answers) {
            alternativas.push(alt);
        }

        this.function.arrayShuffle(alternativas);

        let i = 1;
        this.dom.element.alternativas.innerHTML = '';
        for (const alt of alternativas) {
            const elem = this.dom.template.alternativa.cloneNode(true);
            const input = elem.children[0].children[0];
            const label = elem.children[0].children[1];

            input.id = `alt${i}`;
            input.value = alt;

            label.setAttribute('for', `alt${i}`);
            label.textContent = this.function.decodeText(alt);

            i++;

            this.dom.element.alternativas.appendChild(elem);
        }
    },
    atualizaLabels: function () {
        this.dom.label.pontos.textContent = this.pontos;
        this.dom.label.erros.textContent = `${this.erros} de ${this.maxErros}`;
        this.dom.label.dificuldade.textContent = (this.dificuldade == 'easy') ? 'Fácil' : (this.dificuldade == 'medium') ? 'Médio' : 'Difícil';
        this.dom.label.categoria.textContent = this.perguntaAtual.category;
    },
    responder: function () {
        const altSelecionada = this.dom.element.alternativas.querySelector('input:checked');
        if (altSelecionada == null) {
            alert('Por favor, selecione uma das alternativas!');
            return;
        }

        // Informa a alternativa correta visualmente
        for (const element of this.dom.element.alternativas.children) {
            const input = element.children[0].children[0];
            if (input.value == this.perguntaAtual.correct_answer) {
                input.classList.add('bg-success');
            } else {
                input.classList.add('bg-danger');
            }
            input.setAttribute('disabled', 'true');
        }

        // Define a quantidade de pontos que o jogador irá ganhar ou perder
        let score = (this.dificuldade == 'easy') ? 5 : (this.dificuldade == 'medium') ? 8 : 10;
        if (this.nerf) {
            score -= 2;
            this.nerf = false;
        }

        // Aplica as alterações nos pontos e outros dados e verifica se o jogo finalizou.
        this.respondidas++;
        if (altSelecionada.value == this.perguntaAtual.correct_answer) {
            this.pontos += score;
        } else {
            this.pontos -= score;
            this.erros++;
            if (this.erros >= this.maxErros) {
                this.atualizaLabels();
                this.finalizar(true);
                return;
            }
        }

        this.atualizaLabels();

        this.dom.element.actionResponderPergunta.classList.add('d-none');
        this.dom.element.actionFinalizarJogo.classList.remove('d-none');
    },
    responderMaisTarde: function () {
        if (this.perguntaPulada != undefined) {
            alert('Você não pode deixar mais que uma pergunta pra responder mais tarde!');
            return;
        }

        this.perguntaPulada = this.perguntaAtual;
        this.perguntaAtual = undefined;

        this.getPergunta();
    },
    finalizar: function (perdeu = false) {
        if (perdeu) this.dom.element.modalLabel.textContent = 'Você PERDEU! Resultado Final';
        else this.dom.element.modalLabel.textContent = 'Resultado Final';

        this.dom.label.resultadoPontos.textContent = this.pontos;
        this.dom.label.resultadoCategoria.textContent = this.perguntaAtual.category;
        this.dom.label.resultadoDificuldade.textContent = (this.dificuldade == 'easy') ? 'Fácil' : (this.dificuldade == 'medium') ? 'Médio' : 'Difícil';
        this.dom.label.resultadoRespondidas.textContent = this.respondidas;
        this.dom.label.resultadoAcertos.textContent = this.respondidas - this.erros;
        this.dom.label.resultadoErros.textContent = this.erros;

        const modal = new bootstrap.Modal(this.dom.element.modal, {
            backdrop: 'static',
            keyboard: false
        });

        modal.show();
    }
};