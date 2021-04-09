const axios = require('axios');
const Papa = require('papaparse');
const express = require('express');
const bodyParser = require('body-parser');
const nodeCache = require('node-cache');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
var key = "awwek2348908ujijkzxcnasrewuier";

app.set('key', key);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const cache = new nodeCache();

const getNotas = async () => {
  try {
    var csv = await axios.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vRzLq2_taIClfsbolgy2u9VbLl2w2uogVPdMwhRyJ7Abp8sdcSwWZfjgRg7iRR-C070OEOpfbZSt5Tc/pub?gid=0&single=true&output=csv',
	{
		responseType: 'blob'
	})
	
	const data = Papa.parse(csv.data, { header: true }).data;

	const res = Array.from(
		data.reduce((a, {DNI: DNI, ...rest}) => {
			return a.set(DNI, [rest].concat(a.get(DNI)||[]));
		}, new Map())
	  ).map(([DNI, children])=>({DNI, children}));

	return res;
  } catch (error) {
    console.error(error)
  }
}

const showNotas = async () => {
  const notas = await getNotas()

  if (notas) {
    console.log(notas)
    //notas.map(nota => console.log(nota.Curso))
  }
}

//showNotas();

const secure = express.Router(); 
secure.use((req, res, next) => {
    const token = req.headers['authorization'];

    if (token) {
		jwt.verify(token, app.get('key'), (err, decoded) => {        
			if (err) {
				return res.json({ codigo: -1003, descripcion: 'Sesion invalida' });
			} else {
				req.decoded = decoded;
				next();
			}
		});

		if (req.decoded.ifts !== "IFTS11") {
			return res.json({ codigo: -1002,
				descripcion: 'IFTS invalido' });    
	
		}
	} else {
		res.send({ codigo: -1000,
				descripcion: 'token invalido' });
    }
});

app.post('/login', function(req, res) {
	const payload = {
		ifts: req.body.ifts
	};
	
	console.log('IFTS ' + payload.ifts);

	if (payload.ifts !== "IFTS11") {		
		res.json({
			codigo: -1002,
			descripcion: 'IFTS inexistente'
		});
		
		return;
	}
	
	var usuario = req.body.usuario;
	var pwd = req.body.password;

	if (usuario === "IFTS11" && pwd === "$$%%IFTS11%%$$") {		
		const token = jwt.sign(payload, app.get('key'), {
			expiresIn: 1440
		});

		res.set('Authorization', "Bearer " + token);

		res.json({
			codigo: 0,
			descripcion: 'OK'
		});

		console.log('Token generado ' + token);

	} else {
		res.json({
			codigo: -1001,
			descripcion: 'credencial invalida'
		});
	}
});

app.get('/notas', async (req, res) => {
	try {
		let notas = cache.get('notas');
		if (!notas) {
			console.log('no encontre notas')
			notas = await getNotas();
			cache.set('notas', notas, 1000);
		}
		
		return res.status(200).json({status: 200, notas});
	} catch (error) {
		return res.status(500).send(error)
	}
});

app.get('/notas/:dni', async (req, res) => {
	try {
		let notas = cache.get('notas');
		
		if (!notas) {
			console.log('no encontre notas')
			notas = await getNotas();
			cache.set('notas', notas, 1000);
		}
		
		var notasDni = notas.find(p => p.DNI.toString() === req.params.dni);
		return res.status(200).json({status: 200, notasDni});
	} catch (error) {
		return res.status(500).send(error)
	}
})

app.listen(3001, () => {
	console.log('server is running on port 3001')
});
