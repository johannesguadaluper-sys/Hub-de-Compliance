package com.fintech.spei.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO para Orden de Dispersión SPEI Multimodal:
 * - CLABE Interbancaria (18 dígitos)
 * - Tarjeta Débito/Crédito PAN (16 dígitos)
 * - Celular DIMO Banxico (10 dígitos)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpeiDispersalRequest {

    @NotBlank(message = "La clave de rastreo es obligatoria para idempotencia")
    @Size(min = 10, max = 30, message = "La clave de rastreo debe tener entre 10 y 30 caracteres alfanuméricos")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "La clave de rastreo debe ser alfanumérica")
    private String claveRastreo;

    @NotBlank(message = "El nombre del beneficiario es obligatorio")
    @Size(max = 40, message = "El nombre del beneficiario no debe exceder 40 caracteres")
    private String nombreBeneficiario;

    @NotNull(message = "El tipo de cuenta destino es obligatorio (CLABE, PAN, DIMO)")
    private TipoCuentaSpei tipoCuenta;

    @NotBlank(message = "El número de cuenta/tarjeta/teléfono destino es obligatorio")
    private String cuentaDestino;

    @NotBlank(message = "El código de banco receptor es obligatorio")
    @Pattern(regexp = "^\\d{3}$", message = "El código de banco debe ser de 3 dígitos (ej. 012 BBVA, 002 Banamex)")
    private String bancoReceptorCodigo;

    @Size(max = 18, message = "El RFC o CURP no debe exceder 18 caracteres")
    private String rfcCurpBeneficiario;

    @NotNull(message = "El monto en MXN es obligatorio")
    @DecimalMin(value = "0.01", message = "El monto mínimo de dispersión es $0.01 MXN")
    @Digits(integer = 12, fraction = 2, message = "Formato de monto inválido (máx 2 decimales)")
    private BigDecimal montoMxn;

    @NotBlank(message = "El concepto de pago es obligatorio")
    @Size(max = 40, message = "El concepto de pago no debe exceder 40 caracteres")
    private String concepto;

    @NotBlank(message = "La llave de idempotencia es obligatoria para evitar cargos duplicados")
    private String idempotencyKey;

    public enum TipoCuentaSpei {
        CLABE,  // Tipo 40: 18 dígitos
        PAN,    // Tipo 03: 16 dígitos
        DIMO    // Tipo 10: 10 dígitos celular
    }
}
