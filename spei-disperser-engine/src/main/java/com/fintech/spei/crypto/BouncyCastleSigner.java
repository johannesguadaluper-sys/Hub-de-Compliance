package com.fintech.spei.crypto;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Security;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;

/**
 * Servicio Criptográfico de Firma Digital Bancaria con Bouncy Castle (FIPS / Banxico compliant).
 * Firma la Cadena Original del SPEI con llaves privadas PKCS#8 utilizando SHA256withRSA.
 */
@Component
public class BouncyCastleSigner {

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private final PrivateKey privateKey;

    public BouncyCastleSigner(@Value("${spei.crypto.private-key-pem}") String privateKeyPem) throws Exception {
        this.privateKey = loadPrivateKeyFromPem(privateKeyPem);
    }

    /**
     * Carga y parsea la llave privada PKCS#8 en formato PEM.
     */
    private PrivateKey loadPrivateKeyFromPem(String pem) throws Exception {
        String cleanPem = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] encoded = Base64.decode(cleanPem);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA", BouncyCastleProvider.PROVIDER_NAME);
        return keyFactory.generatePrivate(keySpec);
    }

    /**
     * Firma digitalmente la Cadena Original conforme al algoritmo SHA256withRSA de Banco de México.
     * Retorna el Sello Digital en Base64 para incluir en el payload SPEI y en el comprobante CEP.
     */
    public String signCadenaOriginal(String cadenaOriginal) {
        try {
            Signature signature = Signature.getInstance("SHA256withRSA", BouncyCastleProvider.PROVIDER_NAME);
            signature.initSign(this.privateKey);
            signature.update(cadenaOriginal.getBytes(StandardCharsets.UTF_8));
            byte[] signedBytes = signature.sign();
            return new String(Base64.encode(signedBytes), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Error al generar firma digital bancaria con Bouncy Castle", e);
        }
    }
}
