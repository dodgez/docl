# This code computes 0xBADDCAFE * 0x02

# Don't execute the function definition
jmp start
label double:
  pop eax
  mul 2
  push eax
  ret
label start:

# Place the value at 0xFF to test memory routines
mov eax, 0xF0
mov dword [eax + 0x0F], 0xBADDCAFE

# Place the memory value into ebx to test other registers
mov ebx, dword [eax + 0x0F]
push ebx
call double

# Pop the result into eax to test pushing and popping from different
#  places
pop eax

# Clear out ebx to simplify output
xor ebx, ebx

# Display registers
int 0
