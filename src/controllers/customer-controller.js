'use strict';

const ValidationContract = require('../validators/fluent-validator');
const repository = require('../repositories/customer-repository');
const emailService = require('../services/email-service');
const authService = require('../services/auth-service');
const md5 = require('md5');

exports.post = async (req, res, next) => {

    let contract = new ValidationContract();
    contract.hasMinLen(req.body.name, 3, 'O nome  deve conter pelo menos 3 caracteres');
    contract.hasMinLen(req.body.password, 6, 'A Senha  deve conter pelo menos 6 caracteres');
    contract.isEmail(req.body.email, 'Informar um e-mail válido');

    // Se os dados forem inválidos
    if (!contract.isValid()) {
        res.status(400).send(contract.errors()).end();
        return;
    }

    // Persistência dos dados
    try {
        await repository.create({
            name: req.body.name,
            email: req.body.email,
            password: md5(req.body.password + global.SALT_KEY),
            roles: ["user"]
        });

        //Realiza disparo de e-mail
        emailService.send(
            'marcos.oliveirapinto@hotmail.com',
            'Boas Vindas',
            global.EMAIL_TMPL.replace('{0}', req.body.name)
        );

        res.status(201).send({
            message: 'Cliente cadastrado com sucesso'
        });
    } catch (e) {
        res.status(500).send({
            message: 'Falha no cadastro do cliente'
        });
    }
};

exports.authenticate = async (req, res, next) => {

    try {
        const customer = await repository.authenticate({
            email: req.body.email,
            password: md5(req.body.password + global.SALT_KEY)
        });

        if (!customer) {
            res.status(404).send({
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Gera token de autenticação com base na informações do usuário
        const token = await authService.generateToken({
            id: customer._id,
            email: customer.email, 
            name: customer.name,
            roles: customer.roles
        });

        // Retorna dados necessários
        res.status(201).send({ 
            token: token,
            data: {
                email: customer.email,
                name: customer.name
            }
        });

    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: 'Falha no processamento da requisição'
        });
    }
};